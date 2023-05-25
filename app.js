const express = require("express");
var cookieParser = require("cookie-parser");
const multer = require("multer");
const path = require("path");

const auth = require("./db/auth_db.js");
const sensor = require("./db/sensor_db.js");
const ingredient = require("./db/ingredient_db.js");
const recipe = require("./db/recipe_db.js");
const recipe_in_progress = require("./db/recipe_in_progress.js");
const stage = require("./db/stage_db.js");

const port = 3001;

const app = express();
app.use(express.json());
app.use(cookieParser());

app.use("/img", express.static("img"));
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, "img/");
    },
    filename: function (req, file, cb) {
        const ext = path.extname(file.originalname);
        cb(null, file.fieldname + "-" + Date.now() + ext);
    },
});
const upload = multer({ storage: storage });

app.use(function (req, res, next) {
    res.header("Access-Control-Allow-Credentials", "true");
    res.setHeader("Access-Control-Allow-Origin", "http://localhost:3000");
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type, Access-Control-Allow-Headers");
    next();
});

//

const WebSocket = require("ws");
const wss_sensor = new WebSocket.Server({ port: 8080 });
const wss_my_recipes_in_progress = new WebSocket.Server({ port: 8081 });
const wss_recipe_in_progress = new WebSocket.Server({ port: 8082 });

wss_sensor.on("connection", (ws, req) => {
    const sensor_id = new URLSearchParams(req.url.slice(1)).get("sensor_id");
    console.log(sensor_id + " connected");

    let timeout;

    ws.on("close", () => {
        sensor.updateSensorOnCloseConnection(sensor_id);
        console.log("connection closed");
    });

    ws.on("message", async (message) => {
        clearTimeout(timeout);
        try {
            const data = JSON.parse(message);
            const { temperature, moisture } = data;

            const status = await sensor.updateSensor({
                sensor_id,
                temperature,
                moisture,
            });

            ws.send(JSON.stringify(status));
        } catch (error) {
            console.error(error);
        }

        timeout = setTimeout(() => {
            console.log("10 sec without message");
            sensor.updateSensorOnCloseConnection(sensor_id);
        }, 10000);
    });

    timeout = setTimeout(() => {
        console.log("10 sec without message");
        sensor.updateSensorOnCloseConnection(sensor_id);
    }, 10000);
});

wss_my_recipes_in_progress.on("connection", (ws) => {
    console.log("Client connected");

    let previousResponse = false;

    ws.on("message", async (message) => {
        try {
            const data = JSON.parse(message);
            const { user_id } = data;

            const response = await recipe_in_progress.getRecipesInProgress(user_id);

            if (!previousResponse) {
                previousResponse = response;
                ws.send(JSON.stringify(response));
            } else if (JSON.stringify(response) !== JSON.stringify(previousResponse)) {
                previousResponse = response;
                ws.send(JSON.stringify(response));
            } else {
                ws.send(JSON.stringify({}));
            }
        } catch (error) {
            console.error(error);
        }
    });

    ws.on("close", () => {
        console.log("connection closed");
    });
});

wss_recipe_in_progress.on("connection", (ws) => {
    console.log("Client connected");

    let previousResponse = false;

    ws.on("message", async (message) => {
        try {
            const data = JSON.parse(message);
            const { recipe_in_progress_id, user_id } = data;

            const response = await recipe_in_progress.getRecipeInProgress(recipe_in_progress_id, user_id);

            if (!previousResponse) {
                previousResponse = response;
                ws.send(JSON.stringify(response));
            } else if (JSON.stringify(response) !== JSON.stringify(previousResponse)) {
                previousResponse = response;
                ws.send(JSON.stringify(response));
            } else {
                ws.send(JSON.stringify({}));
            }
        } catch (error) {
            console.error(error);
        }
    });

    ws.on("close", () => {
        console.log("connection closed");
    });
});

//

app.get("/auth/register", async (req, res) => {
    try {
        const response = await auth.getUsers();
        res.status(200).send(response);
    } catch (error) {
        res.status(500).send(error);
    }
});

app.post("/auth/register", async (req, res) => {
    try {
        const response = await auth.register(req.body);
        res.status(200).send(response);
    } catch (error) {
        res.status(500).send(error);
    }
});

app.put("/auth/register", async (req, res) => {
    try {
        const response = await auth.changeUser(req.body);
        res.status(200).send(response);
    } catch (error) {
        res.status(500).send(error);
    }
});

app.delete("/auth/register", async (req, res) => {
    try {
        const response = await auth.deleteUser(req.body);
        res.status(200).send(response);
    } catch (error) {
        res.status(500).send(error);
    }
});

app.post("/auth/login", async (req, res) => {
    try {
        const response = await auth.login(req.body);
        res.status(200).cookie("userId", response.user_id).send(response);
    } catch (error) {
        res.status(500).send(error);
    }
});

//

app.get("/ingredient", async (req, res) => {
    try {
        const response = await ingredient.getIngredients();
        res.status(200).send(response);
    } catch (error) {
        res.status(500).send(error);
    }
});

app.post("/ingredient", async (req, res) => {
    try {
        const { name } = req.body;
        const newIngredient = await ingredient.addIngredient(name);
        res.status(200).send(newIngredient);
    } catch (error) {
        res.status(500).send(error);
    }
});

app.put("/ingredient", async (req, res) => {
    try {
        const id = req.body.id;
        const name = req.body.name;
        const result = await ingredient.updateIngredient(id, name);
        res.status(200).send(result);
    } catch (error) {
        res.status(500).send(error);
    }
});

app.delete("/ingredient", async (req, res) => {
    const ingredientId = req.body.id;
    try {
        const response = await ingredient.deleteIngredient(ingredientId);
        res.status(200).send(response);
    } catch (error) {
        res.status(500).send(error);
    }
});

//

app.post("/stage/next", async (req, res) => {
    try {
        const response = await stage.nextStage(req.body);
        res.status(200).send(response);
    } catch (error) {
        res.status(500).send(error);
    }
});

app.post("/stage/next/withtimer", async (req, res) => {
    try {
        const response = await stage.nextStageWithTimer(req.body);
        res.status(200).send(response);
    } catch (error) {
        res.status(500).send(error);
    }
});

app.post("/stage/finish", async (req, res) => {
    try {
        const response = await stage.finishStage(req.body);
        res.status(200).send(response);
    } catch (error) {
        res.status(500).send(error);
    }
});

app.post("/stage", async (req, res) => {
    try {
        const response = await stage.createStage(req.body);
        res.status(200).send(response);
    } catch (error) {
        res.status(500).send(error);
    }
});

app.put("/stage", async (req, res) => {
    try {
        const response = await stage.updateStage(req.body);
        res.status(200).send(response);
    } catch (error) {
        res.status(500).send(error);
    }
});

//

app.get("/recipe/inprogress", async (req, res) => {
    try {
        const response = await recipe_in_progress.getRecipesInProgress(req.body.user_id);
        res.status(200).send(response);
    } catch (error) {
        res.status(500).send(error);
    }
});

app.get("/recipe/inprogress/:recipe_in_progress_id", async (req, res) => {
    try {
        const response = await recipe_in_progress.getRecipeInProgress(req.params.recipe_in_progress_id, req.body.user_id);
        res.status(200).send(response);
    } catch (error) {
        res.status(500).send(error);
    }
});

app.post("/recipe/inprogress", async (req, res) => {
    try {
        const response = await recipe_in_progress.createRecipeInPogress(req.body);
        res.status(200).send(response);
    } catch (error) {
        res.status(500).send(error);
    }
});

app.delete("/recipe/inprogress", async (req, res) => {
    try {
        const response = await recipe_in_progress.deleteRecipeInPogress(req.body);
        res.status(200).send(response);
    } catch (error) {
        res.status(500).send(error);
    }
});

//

app.get("/recipe", async (req, res) => {
    try {
        const response = await recipe.getSearchRecipe(req.body);
        res.status(200).send(response);
    } catch (error) {
        res.status(500).send(error);
    }
});

app.get("/recipe/:recipe_id", async (req, res) => {
    try {
        const response = await recipe.getRecipeDetails(req.params);
        res.status(200).send(response);
    } catch (error) {
        res.status(500).send(error);
    }
});

app.post("/recipe", upload.single("RecipeCover"), async (req, res) => {
    try {
        const response = await recipe.createRecipe(req.body, req.file);
        res.status(200).send(response);
    } catch (error) {
        res.status(500).send(error);
    }
});

app.put("/recipe", upload.single("RecipeCover"), async (req, res) => {
    try {
        const response = await recipe.updateRecipe(req.body, req.file);
        res.status(200).send(response);
    } catch (error) {
        res.status(500).send(error);
    }
});

app.delete("/recipe", async (req, res) => {
    try {
        const response = await recipe.deleteRecipe(req.body.recipeId);
        res.status(200).send(response);
    } catch (error) {
        res.status(500).send(error);
    }
});

//

app.get("/sensor", async (req, res) => {
    try {
        const response = await sensor.getSensors();
        res.status(200).send(response);
    } catch (error) {
        console.error(error);
        res.status(500).send(error);
    }
});

app.post("/sensor", async (req, res) => {
    try {
        const response = await sensor.addSensor(req.body.sensor_id);
        res.status(200).send(response);
    } catch (error) {
        console.error(error);
        res.status(500).send(error);
    }
});

app.put("/sensor", async (req, res) => {
    try {
        const response = await sensor.updateSensor(req.body);
        res.status(200).send(response);
    } catch (error) {
        res.status(500).send(error);
    }
});

app.delete("/sensor", async (req, res) => {
    try {
        const response = await sensor.deleteSensor(req.body);
        res.status(200).send(response);
    } catch (error) {
        res.status(500).send(error);
    }
});

//

app.post("/sensor/connection", async (req, res) => {
    try {
        const response = await sensor.createSensorConnection(req.body);
        res.status(200).send(response);
    } catch (error) {
        res.status(500).send(error);
    }
});

app.put("/sensor/connection", async (req, res) => {
    try {
        const response = await sensor.updateSensorConnection(req.body);
        res.status(200).send(response);
    } catch (error) {
        res.status(500).send(error);
    }
});

app.delete("/sensor/connection", async (req, res) => {
    try {
        const response = await sensor.deleteSensorConnection(req.body);
        res.status(200).send(response);
    } catch (error) {
        res.status(500).send(error);
    }
});

//

app.listen(port, () => {
    console.log(`App running on port ${port}.`);
    stage.executeForgottenTimers();
});
