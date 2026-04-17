require('dotenv').config();
const router = require('express').Router();
const axios = require('axios');
const{ v4: uuidv4 } = require('uuid');
const { pool } = require('../database');
const { Result } = require('pg');

// POST /api/profiles
router.post('/profiles', async (req, res) => {

    //VALIDATE INPUT
    const { name } = req.body;

    if (name === undefined || name === '') {
        return res.status(400).json({
            status: 'error',
            message: 'name parameter is required'
        });
    }

    if (typeof name != 'string') {
        return res.status(422).json({
            status: 'error',
            message: 'name must be a string'
        });
    }

    // Check if profile already exists
    const existing = await pool.query(
        'SELECT * FROM profiles WHERE LOWER(name) = LOWER($1)',
        [name]
    );

    if (existing.rows.length > 0) {
        return res.status(200).json({
            status: 'success',
            message: 'Profile already exists',
            data: existing.rows[0]
        });
    }

    // Call all 3 APIs simultaneously
    let genderizeData, agifyData, nationalizeData;

    try {
        const [genderizeRes, agifyRes, nationalizeRes] = await Promise.all([
            axios.get('https://api.genderize.io', {params: { name }}),
            axios.get('https://api.agify.io', {params: { name }}),
            axios.get('https://api.nationalize.io', { params: { name }})
        ]);

        genderizeData = genderizeRes.data;
        agifyData = agifyRes.data;
        nationalizeData = nationalizeRes.data;
    }
    catch (error) {
        console.log(error.message);

        return res.status(502).json({
            status: 'error',
            message: 'Failed to reach an external API'
        });

    
    }

    //Handle Edge Cases
    if (genderizeData.gender === null || genderizeData.count === 0) {
        return res.status(502).json ({
            status: '502', 
            message: 'Genderize returned an invalid response'
        });
    }

    if (agifyData.age === null) {
        return res. status(502).json({
            status: '502',
            message: 'Agify returned an invalid response'
        });
    }

    if (!nationalizeData.country || nationalizeData.country.length === 0) {
        return res(502).json({
            status: '502',
            message: 'Nationalize returned an invalid response'
        });
    }

    //Process the data
    const gender = genderizeData.gender;
    const gender_probability = genderizeData.probability;
    const sample_size = genderizeData.count;

    const age = agifyData.age;
    const age_group = 
    age <= 12 ? 'child':
    age <= 19 ? 'teenager' :
    age <= 59 ? 'adult' : 'senior';

    const topCountry = nationalizeData.country.reduce((a,b) =>
        a.probability > b.probability ? a : b);

    const country_id = topCountry.country_id;
    const country_probability = topCountry.probability;

    const id = uuidv4();
    const created_at = new Date().toISOString();


    //Save to database
    await pool.query(
        `INSERT INTO profiles
        (id, name, gender, gender_probability, sample_size, age, age_group, country_id, country_probability, created_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
        [id, name, gender, gender_probability, sample_size, age, age_group, country_id, country_probability, created_at]
    );

    //Return the result
    return res.status(201).json({
        status:'success', 
        data: {
            id,
            name,
            gender,
            gender_probability,
            sample_size,
            age,
            age_group,
            country_id,
            country_probability,
            created_at
        }
    })

});

// routes

router.get('/profiles/:id', async(req, res) => {
    const { id } = req.params;

    const result = await pool.query(
        `SELECT * FROM profiles WHERE id = $1`,
        [id]
    );

    if (result.rows.length === 0) {
        return res.status(404).json({
            status: 'error',
            message: 'Profile not found'
        });
    }

    return res.status(200).json({
        status: 'success',
        data: result.rows[0]
    });
});


router.get('/profiles', async(req, res) => {
    const { gender, country_id, age_group } = req.query;
     let query = 'SELECT id, name, gender, age, age_group, country_id FROM profiles WHERE 1=1';
    const params = [];

    if (gender) {
        params.push(gender.toLowerCase());
        query += ` AND LOWER(gender) = $${params.length}`;
    }

    if (country_id) {
        params.push(country_id.toLowerCase());
        query += ` AND LOWER(COUNTRY_ID) = $${params.length}`;
    }

    if (age_group) {
        params.push(age_group.toLowerCase());
        query += ` AND LOWER(age_group) = $${params.length}`;
    }

    const result = await pool.query(query, params);

    return res.status(200).json({
        status: 'success',
        count: result.rows.length,
        data: result.rows
    });
});

router.delete('/profiles/:id', async (req, res) => {
    const { id } = req.params;
    
    const result = await pool.query(
        `DELETE FROM profiles WHERE id = $1 RETURNING id`,
        [id]
    );

    if (result.rows.length === 0) {
        return res.status(404).json({
            status: 'error',
            message: 'Profile not found'
        });
    }

    return res.status(204).send();
});

module.exports = router;