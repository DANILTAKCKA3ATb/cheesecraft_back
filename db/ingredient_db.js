const client = require("./db.js");

const getIngredients = async () => {
    try {
        const result = await client.query("SELECT * FROM ingredient");
        return result.rows;
    } catch (error) {
        console.error(error);
        throw error;
    }
};

const addIngredient = async (name) => {
    try {
        const result = await client.query(`INSERT INTO ingredient (name) VALUES ($1)`, [name]);
        return {};
    } catch (error) {
        console.error(error);
        throw error;
    }
};

const updateIngredient = async (id, name) => {
    try {
        const result = await client.query("UPDATE ingredient SET name=$1 WHERE ingredient_id=$2 ", [name, id]);
        return {};
    } catch (error) {
        console.error(error);
        throw error;
    }
};

const deleteIngredient = async (id) => {
    try {
        await client.query("DELETE FROM ingredient WHERE ingredient_id = $1", [id]);
        return {};
    } catch (error) {
        console.error(error);
        throw error;
    }
};

module.exports = {
    getIngredients,
    addIngredient,
    updateIngredient,
    deleteIngredient,
};
