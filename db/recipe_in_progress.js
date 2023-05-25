const uuid = require("uuid");
const client = require("./db.js");

async function getRecipesInProgress(user_id) {
    try {
        const recipesInProgress = await client.query(
            `SELECT
        rip.recipe_in_progress_id,
        rip.recipe_id,
        rip.is_finished,
        rip.current_stage,
        rip.current_date_to_wait,
        r.name AS recipe_name,
        r.aging_temperature_min,
        r.aging_temperature_max,
        r.aging_moisture_min,
        r.aging_moisture_max,
        r.image_path AS recipe_image_path,
        COUNT(sg.stage_id) AS stage_count,
        sc.sensor_connection_id,
        se.sensor_id,
        ss.name AS sensor_status_name,
        ss.sensor_status_id,
        se.temperature,
        se.moisture
      FROM
        recipe_in_progress rip
        INNER JOIN recipe r ON rip.recipe_id = r.recipe_id
        LEFT JOIN stage sg ON rip.recipe_id = sg.recipe_id
        LEFT JOIN sensor_connection sc ON rip.recipe_in_progress_id = sc.recipe_in_progress_id
        LEFT JOIN sensor se ON sc.sensor_id = se.sensor_id
        LEFT JOIN sensor_status ss ON sc.status = ss.sensor_status_id
      WHERE
        rip.user_id = $1
      GROUP BY
        rip.recipe_in_progress_id,
        rip.recipe_id,
        rip.is_finished,
        rip.current_stage,
        rip.current_date_to_wait,
        r.name,
        r.aging_temperature_min,
        r.aging_temperature_max,
        r.aging_moisture_min,
        r.aging_moisture_max,
        r.image_path,
        sc.sensor_connection_id,
        se.sensor_id,
        ss.name,
        se.temperature,
        se.moisture,
        ss.sensor_status_id;`,
            [user_id]
        );

        const formattedRecipes = recipesInProgress.rows.map((row) => ({
            recipe_in_progress_id: row.recipe_in_progress_id,
            is_finished: row.is_finished,
            current_stage: row.current_stage,
            current_date_to_wait: row.current_date_to_wait,
            recipe: {
                recipe_id: row.recipe_id,
                name: row.name,
                aging_temperature_min: row.aging_temperature_min,
                aging_temperature_max: row.aging_temperature_max,
                aging_moisture_min: row.aging_moisture_min,
                aging_moisture_max: row.aging_moisture_max,
                image_path: row.recipe_image_path,
            },
            stage_count: parseInt(row.stage_count) || 0,
            sensor_connection: {
                sensor_connection_id: row.sensor_connection_id,
                sensor_id: row.sensor_id,
                sensor_status_name: row.sensor_status_name,
                sensor_status_id: row.sensor_status_id,
                temperature: row.temperature,
                moisture: row.moisture,
            },
        }));

        return formattedRecipes;
    } catch (error) {
        console.error(error);
        throw error;
    }
}

async function getRecipeInProgress(recipe_in_progress_id, user_id) {
    try {
        let recipe = await client.query(
            `SELECT
            rip.*, r.*,
            sc.sensor_connection_id,
            sc.status,
            ss.name AS sensor_status_name,
            s.sensor_id,
            s.temperature,
            s.moisture
        FROM
            recipe_in_progress rip
            JOIN recipe r ON rip.recipe_id = r.recipe_id
            LEFT JOIN sensor_connection sc ON rip.recipe_in_progress_id = sc.recipe_in_progress_id
            LEFT JOIN sensor_status ss ON sc.status = ss.sensor_status_id
            LEFT JOIN sensor s ON sc.sensor_id = s.sensor_id
        WHERE
            rip.recipe_in_progress_id = $1 AND rip.user_id = $2`,
            [recipe_in_progress_id, user_id]
        );
        recipe = recipe.rows[0];

        let stages = await client.query(`SELECT * FROM stage WHERE recipe_id = $1`, [recipe.recipe_id]);
        stages = stages.rows;

        let ingredients = await client.query(
            `SELECT required_ingredient.required_ingredient_id, 
            ingredient.name, required_ingredient.amount
            FROM required_ingredient
            INNER JOIN ingredient ON required_ingredient.ingredient_id = 
            ingredient.ingredient_id
            WHERE required_ingredient.recipe_id = $1`,
            [recipe.recipe_id]
        );
        ingredients = ingredients.rows;

        recipe.stages = stages;
        recipe.ingredients = ingredients;

        return recipe;
    } catch (error) {
        console.error(error);
        throw error;
    }
}

const createRecipeInPogress = async (body) => {
    const { recipe_id, user_id } = body;
    const recipe_in_progress_id = uuid.v4();
    try {
        await client.query(
            `INSERT INTO recipe_in_progress 
            (recipe_in_progress_id, recipe_id, user_id) 
            VALUES ($1, $2, $3)`,
            [recipe_in_progress_id, recipe_id, user_id]
        );
        return {};
    } catch (error) {
        console.error(error);
        throw error;
    }
};

const deleteRecipeInPogress = async (body) => {
    const { recipe_in_progress_id } = body;
    try {
        await client.query(
            `DELETE FROM recipe_in_progress 
            WHERE recipe_in_progress_id = $1`,
            [recipe_in_progress_id]
        );
        return {};
    } catch (error) {
        console.error(error);
        throw error;
    }
};

module.exports = {
    getRecipesInProgress,
    getRecipeInProgress,
    createRecipeInPogress,
    deleteRecipeInPogress,
};
