const uuid = require("uuid");
const fs = require("fs");
const client = require("./db.js");

const getSearchRecipe = async (body) => {
    try {
        const result = await client.query(
            `SELECT recipe.recipe_id, recipe.name, 
            recipe.yield, recipe.aging_time_min, 
            recipe.aging_time_max, recipe.image_path, 
            COUNT(stage.stage_id) AS stage_count
            FROM recipe
            LEFT JOIN stage ON recipe.recipe_id = stage.recipe_id
            WHERE recipe.name ILIKE $1
            GROUP BY recipe.recipe_id`,
            ["%" + body.search_text + "%"]
        );
        return result.rows;
    } catch (error) {
        console.error(error);
        throw error;
    }
};

const getRecipeDetails = async (body) => {
    try {
        const recipeResult = await client.query(`SELECT * FROM recipe WHERE recipe_id = $1`, [body.recipe_id]);

        const stagesResult = await client.query(
            `SELECT stage_id, stage_number, name, description 
            FROM stage WHERE recipe_id = $1`,
            [body.recipe_id]
        );

        const ingredientsResult = await client.query(
            `SELECT required_ingredient.required_ingredient_id, 
            ingredient.name, required_ingredient.amount
            FROM required_ingredient
            INNER JOIN ingredient ON required_ingredient.ingredient_id = 
            ingredient.ingredient_id
            WHERE required_ingredient.recipe_id = $1`,
            [body.recipe_id]
        );

        const recipeDetails = recipeResult.rows[0];
        recipeDetails.stages = stagesResult.rows;
        recipeDetails.ingredients = ingredientsResult.rows;
        return recipeDetails;
    } catch (error) {
        console.error(error);
        throw error;
    }
};

const createRecipe = async (body, file) => {
    const {
        name,
        description,
        yield,
        aging_time_min,
        aging_time_max,
        aging_temperature_min,
        aging_temperature_max,
        aging_moisture_min,
        aging_moisture_max,
        ingredients,
    } = body;

    let file_path = null;

    if (!!file) {
        console.log("with image");
        file_path = file.path;
    }

    const recipeId = uuid.v4();

    try {
        await client.query("BEGIN");

        await client.query(
            `INSERT INTO recipe 
            (recipe_id, name, description, yield, 
            aging_time_min, aging_time_max, aging_temperature_min, 
            aging_temperature_max, aging_moisture_min, 
            aging_moisture_max, image_path) 
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
            [
                recipeId,
                name,
                description,
                yield,
                aging_time_min,
                aging_time_max,
                aging_temperature_min,
                aging_temperature_max,
                aging_moisture_min,
                aging_moisture_max,
                file_path,
            ]
        );

        for (const ingredient of ingredients) {
            await client.query(
                `INSERT INTO required_ingredient 
                ( ingredient_id, recipe_id, amount) 
                VALUES ($1, $2, $3)`,
                [ingredient.id, recipeId, ingredient.amount]
            );
        }

        await client.query("COMMIT");

        return {};
    } catch (error) {
        await client.query("ROLLBACK");
        console.error(error);
        throw error;
    }
};

const updateRecipe = async (body, file) => {
    const {
        recipeId,
        name,
        description,
        yield,
        aging_time_min,
        aging_time_max,
        aging_temperature_min,
        aging_temperature_max,
        aging_moisture_min,
        aging_moisture_max,
        ingredients,
    } = body;

    const remove = body.remove_image == "true" ? true : false;

    let file_path = null;

    if (!!body.image_path) file_path = body.image_path;

    if (!!file) file_path = file.path;

    if (remove) file_path = null;

    if (!!body.image_path && !!file && !remove) {
        try {
            fs.unlink(body.image_path, (err) => {
                if (err) throw err;
                console.log(`${body.image_path} was deleted`);
            });
        } catch (e) {
            console.log(e);
        }
    }

    if (remove && !!body.image_path) {
        try {
            fs.unlink(body.image_path, (err) => {
                if (err) throw err;
                console.log(`${body.image_path} was deleted`);
            });
        } catch (e) {
            console.log(e);
        }
    }

    if (remove && !!file) {
        try {
            fs.unlink(file.path, (err) => {
                if (err) throw err;
                console.log(`${file.path} was deleted`);
            });
        } catch (e) {
            console.log(e);
        }
    }

    try {
        await client.query("BEGIN");

        await client.query(
            `UPDATE recipe SET name = $1, description = $2, 
            yield = $3, aging_time_min = $4, aging_time_max = $5, 
            aging_temperature_min = $6, aging_temperature_max = $7, 
            aging_moisture_min = $8, aging_moisture_max = $9, 
            image_path = $10 WHERE recipe_id = $11`,
            [
                name,
                description,
                yield,
                aging_time_min,
                aging_time_max,
                aging_temperature_min,
                aging_temperature_max,
                aging_moisture_min,
                aging_moisture_max,
                file_path,
                recipeId,
            ]
        );

        await client.query("DELETE FROM required_ingredient WHERE recipe_id = $1", [recipeId]);

        for (const ingredient of ingredients) {
            await client.query(
                `INSERT INTO required_ingredient 
                ( ingredient_id, recipe_id, amount) 
                VALUES ($1, $2, $3)`,
                [ingredient.id, recipeId, ingredient.amount]
            );
        }

        await client.query("COMMIT");

        return {};
    } catch (error) {
        await client.query("ROLLBACK");
        console.error(error);
        throw error;
    }
};

const deleteRecipe = async (recipeId) => {
    try {
        let image_path = await client.query(
            `select image_path from recipe 
            where recipe_id = $1`,
            [recipeId]
        );
        image_path = image_path.rows[0].image_path;

        if (!!image_path) {
            try {
                fs.unlink(image_path, (err) => {
                    if (err) throw err;
                    console.log(`${image_path} was deleted`);
                });
            } catch (e) {
                console.log(e);
            }
        }

        await client.query(
            `DELETE FROM recipe 
            WHERE recipe_id = $1`,
            [recipeId]
        );
        return {};
    } catch (error) {
        console.error(error);
        throw error;
    }
};

module.exports = {
    getSearchRecipe,
    getRecipeDetails,
    createRecipe,
    updateRecipe,
    deleteRecipe,
};
