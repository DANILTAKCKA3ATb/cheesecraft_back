const uuid = require("uuid");
const client = require("./db.js");

const getUsers = async () => {
    try {
        const result = await client.query(`SELECT * FROM _user`);
        return result.rows;
    } catch (error) {
        console.error(error);
        throw error;
    }
};

const register = async (body) => {
    const { login, password } = body;
    let exist = false;
    try {
        const results = await client.query(`SELECT * FROM _user WHERE login = $1`, [login]);
        if (!!results.rows && results.rows.length > 0) {
            exist = true;
        }
        if (!exist) {
            const id = uuid.v4();
            await client.query(`INSERT INTO _user VALUES ($1, $2, $3)`, [id, login, password]);
            return {};
        } else {
            return { uns: "Exist" };
        }
    } catch (error) {
        console.error(error);
        throw error;
    }
};

const login = async (body) => {
    try {
        const { login, password } = body;
        const result = await client.query(`SELECT user_id FROM _user WHERE login = $1 AND password = $2`, [login, password]);

        if (result.rows.length === 1) {
            return {
                user_id: result.rows[0].user_id,
            };
        }
    } catch (error) {
        console.error(error);
        throw error;
    }
};

const changeUser = async (body) => {
    const { user_id, login, password } = body;
    try {
        await client.query(`update _user set login = $1, password = $2 where user_id = $3`, [login, password, user_id]);
        return {};
    } catch (error) {
        console.error(error);
        throw error;
    }
};

const deleteUser = async (body) => {
    const { user_id } = body;
    try {
        await client.query(`delete from _user where user_id = $1`, [user_id]);
        return {};
    } catch (error) {
        console.error(error);
        throw error;
    }
};

module.exports = {
    getUsers,
    register,
    login,
    changeUser,
    deleteUser,
};
