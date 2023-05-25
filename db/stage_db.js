const uuid = require("uuid");
const client = require("./db.js");

const executeForgottenTimers = async () => {
    try {
        const queryResult = await client.query(
            `SELECT recipe_in_progress_id, current_date_to_wait 
         FROM recipe_in_progress 
         WHERE current_date_to_wait IS NOT NULL`
        );

        for (const row of queryResult.rows) {
            const { recipe_in_progress_id, current_date_to_wait } = row;

            const body = {
                datetime: current_date_to_wait,
                recipe_in_progress_id: recipe_in_progress_id,
            };

            console.log(`recipe ${recipe_in_progress_id} timer waiting by date ${current_date_to_wait} restored`);
            nextStageWithTimer(body).catch((error) => console.error(`Error executing nextStageWithTimer: ${error}`));
        }
    } catch (error) {
        console.error(`Error executing forgotten timers: ${error}`);
    }
};

const nextStage = async (body) => {
    try {
        await client.query(
            `UPDATE recipe_in_progress
            SET current_stage = current_stage + 1
            WHERE recipe_in_progress_id = $1`,
            [body.recipe_in_progress_id]
        );
        return {};
    } catch (error) {
        console.error(error);
        throw error;
    }
};

const nextStageWithTimer = async (body) => {
    try {
        const { recipe_in_progress_id, datetime } = body;

        await client.query(
            `UPDATE recipe_in_progress
            SET current_date_to_wait = $1
            WHERE recipe_in_progress_id = $2`,
            [datetime, recipe_in_progress_id]
        );

        const currentTime = new Date();
        const targetTime = new Date(datetime);
        const timeDifference = targetTime - currentTime;

        await new Promise((resolve) => setTimeout(resolve, timeDifference));

        await client.query(
            `UPDATE recipe_in_progress
            SET current_date_to_wait = NULL,
            current_stage = current_stage + 1
            WHERE recipe_in_progress_id = $1`,
            [recipe_in_progress_id]
        );

        return {};
    } catch (error) {
        console.error(error);
        throw error;
    }
};

const finishStage = async (body) => {
    try {
        await client.query(
            `UPDATE recipe_in_progress
            SET is_finished = true
            WHERE recipe_in_progress_id = $1`,
            [body.recipe_in_progress_id]
        );
        return {};
    } catch (error) {
        console.error(error);
        throw error;
    }
};

const createStage = async (body) => {
    try {
        await client.query("BEGIN");

        const recipe_id = body.recipe_id;

        for (let i = 0; i < body.stages.length; i++) {
            const { stage_number, name, description, is_aging_stage, timer } = body.stages[i];

            const stageId = uuid.v4();

            await client.query(
                `INSERT INTO stage
                (stage_id, recipe_id, stage_number, 
                name, description, is_aging_stage, timer)
                VALUES ($1, $2, $3, $4, $5, $6, $7)`,
                [stageId, recipe_id, stage_number, name, description, is_aging_stage, timer]
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

const updateStage = async (body) => {
    try {
        await client.query("BEGIN");

        const recipe_id = body.recipe_id;

        await client.query(
            `DELETE FROM stage 
            WHERE recipe_id = $1`,
            [recipe_id]
        );

        for (let i = 0; i < body.stages.length; i++) {
            const { stage_number, name, description, is_aging_stage, timer } = body.stages[i];

            const stageId = uuid.v4();

            await client.query(
                `INSERT INTO stage
                (stage_id, recipe_id, stage_number, 
                name, description, is_aging_stage, timer)
                VALUES ($1, $2, $3, $4, $5, $6, $7)`,
                [stageId, recipe_id, stage_number, name, description, is_aging_stage, timer]
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

module.exports = {
    executeForgottenTimers,
    nextStage,
    nextStageWithTimer,
    finishStage,
    createStage,
    updateStage,
};
