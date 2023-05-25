const uuid = require("uuid");
const client = require("./db.js");

const getSensors = async () => {
    try {
        const result = await client.query("SELECT * FROM sensor");
        return result.rows;
    } catch (error) {
        console.error(error);
        throw error;
    }
};

const addSensor = async (sensor_id) => {
    try {
        await client.query(
            `INSERT INTO sensor (sensor_id) 
            VALUES ($1)`,
            [sensor_id]
        );
        return {};
    } catch (error) {
        console.error(error);
        throw error;
    }
};

const updateSensor = async (body) => {
    try {
        const { sensor_id, temperature, moisture } = body;

        await client.query(
            `UPDATE sensor SET temperature=$1, moisture=$2 
            WHERE sensor_id=$3`,
            [temperature, moisture, sensor_id]
        );

        let connections = await client.query(
            `SELECT 
            recipe.aging_temperature_min, recipe.aging_temperature_max,
            recipe.aging_moisture_min, recipe.aging_moisture_max,
            sensor_connection.sensor_connection_id
            FROM recipe
            JOIN recipe_in_progress 
                ON recipe.recipe_id = recipe_in_progress.recipe_id
            JOIN sensor_connection 
                ON recipe_in_progress.recipe_in_progress_id 
                    = sensor_connection.recipe_in_progress_id
            WHERE sensor_connection.sensor_id = $1
                AND recipe_in_progress.is_finished = false`,
            [sensor_id]
        );

        connections = connections.rows;

        if (connections.length > 0) {
            let commonIntervalTemperature = [Number.NEGATIVE_INFINITY, Number.POSITIVE_INFINITY];
            let isPossibleTemperature = true;

            connections.forEach((connection) => {
                const min = connection.aging_temperature_min;
                const max = connection.aging_temperature_max;

                if (min > commonIntervalTemperature[1] || max < commonIntervalTemperature[0]) {
                    isPossibleTemperature = false;
                    return;
                }

                commonIntervalTemperature[0] = Math.max(commonIntervalTemperature[0], min);
                commonIntervalTemperature[1] = Math.min(commonIntervalTemperature[1], max);
            });
            //
            let commonIntervalMoisture = [Number.NEGATIVE_INFINITY, Number.POSITIVE_INFINITY];
            let isPossibleMoisture = true;

            connections.forEach((connection) => {
                const min = connection.aging_moisture_min;
                const max = connection.aging_moisture_max;

                if (min > commonIntervalMoisture[1] || max < commonIntervalMoisture[0]) {
                    isPossibleMoisture = false;
                    return;
                }

                commonIntervalMoisture[0] = Math.max(commonIntervalMoisture[0], min);
                commonIntervalMoisture[1] = Math.min(commonIntervalMoisture[1], max);
            });

            if (!isPossibleTemperature || !isPossibleMoisture) {
                for (const connection of connections) {
                    await client.query(
                        `UPDATE sensor_connection
                        SET status = 3
                        WHERE sensor_connection_id = $1`,
                        [connection.sensor_connection_id]
                    );
                }
                let response = await client.query(
                    `select * from sensor_status 
                    where sensor_status_id = 3`
                );
                return response.rows[0];
            }

            let somethingWrong = false;

            for (const connection of connections) {
                if (
                    temperature >= connection.aging_temperature_min &&
                    temperature <= connection.aging_temperature_max &&
                    moisture >= connection.aging_moisture_min &&
                    moisture <= connection.aging_moisture_max
                ) {
                    await client.query(
                        `UPDATE sensor_connection
                        SET status = 1
                        WHERE sensor_connection_id = $1`,
                        [connection.sensor_connection_id]
                    );
                } else {
                    somethingWrong = true;
                    await client.query(
                        `UPDATE sensor_connection
                        SET status = 2
                        WHERE sensor_connection_id = $1`,
                        [connection.sensor_connection_id]
                    );
                }
            }

            if (somethingWrong) {
                let response = await client.query(
                    `select * from sensor_status 
                    where sensor_status_id = 2`
                );
                return response.rows[0];
            } else {
                let response = await client.query(
                    `select * from sensor_status 
                    where sensor_status_id = 1`
                );
                return response.rows[0];
            }
        } else return { sensor_status_id: 0, name: "off" };
    } catch (error) {
        console.error(error);
        throw error;
    }
};

const updateSensorOnCloseConnection = async (sensor_id) => {
    try {
        await client.query(
            `UPDATE sensor_connection  
            SET status = 4 
            WHERE sensor_id = $1`,
            [sensor_id]
        );
        return {};
    } catch (error) {
        console.error(error);
        throw error;
    }
};

const deleteSensor = async (body) => {
    try {
        await client.query(
            `DELETE FROM sensor 
            WHERE sensor_id = $1`,
            [body.sensor_id]
        );
        return {};
    } catch (error) {
        console.error(error);
        throw error;
    }
};

const createSensorConnection = async (body) => {
    const { recipe_in_progress_id, sensor_id } = body;
    const sensor_connection_id = uuid.v4();
    try {
        await client.query(
            `INSERT INTO sensor_connection 
            (sensor_connection_id, recipe_in_progress_id, sensor_id, status) 
            VALUES ($1, $2, $3, 4)`,
            [sensor_connection_id, recipe_in_progress_id, sensor_id]
        );
        return {};
    } catch (error) {
        console.error(error);
        throw error;
    }
};

const updateSensorConnection = async (body) => {
    const { sensor_connection_id, status } = body;
    try {
        const result = await client.query(
            `UPDATE sensor_connection 
            SET status = $1 
            WHERE sensor_connection_id = $2`,
            [status, sensor_connection_id]
        );
        return {};
    } catch (error) {
        console.error(error);
        throw error;
    }
};

const deleteSensorConnection = async (body) => {
    const { sensor_connection_id } = body;
    try {
        const result = await client.query(
            `DELETE FROM sensor_connection 
            WHERE sensor_connection_id = $1`,
            [sensor_connection_id]
        );
        return {};
    } catch (error) {
        console.error(error);
        throw error;
    }
};

module.exports = {
    getSensors,
    addSensor,
    updateSensor,
    deleteSensor,
    createSensorConnection,
    updateSensorConnection,
    updateSensorOnCloseConnection,
    deleteSensorConnection,
};
