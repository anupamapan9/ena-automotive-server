const express = require('express')
const app = express()
const port = process.env.PORT || 5000
const cors = require('cors');
const jwt = require('jsonwebtoken');
const { MongoClient, ServerApiVersion, Collection, ObjectId } = require('mongodb');

require('dotenv').config()


// middle ware
app.use(cors())
app.use(express.json())


const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@cluster0.hdvzk.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });

const verifyJWT = (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
        return res.status(401).send({ message: 'Unauthorized Access' })
    }
    const token = authHeader.split(' ')[1];
    jwt.verify(token, process.env.JWT_SECRET, function (err, decoded) {
        if (err) {
            return res.status(403).send({ message: 'Forbidden Access' })
        }
        req.decoded = decoded
        next()
    });
}

async function run() {
    try {
        await client.connect()
        // Database Collection  start -------------------
        const productsCollection = client.db('enaAutomotive').collection('products');
        const usersCollection = client.db('enaAutomotive').collection('users');
        const ordersCollection = client.db('enaAutomotive').collection('orders');
        // Database Collection  End -------------------




        // products  ---***--- 
        app.get('/product', async (req, res) => {
            const query = {}
            const result = await productsCollection.find(query).toArray()
            res.send(result)
        })
        app.get('/product/:id', verifyJWT, async (req, res) => {
            const id = req.params.id;
            const query = { _id: ObjectId(id) }
            const result = await productsCollection.findOne(query)
            res.send(result)
        })

        // Users Api ------------************-----------
        app.put('/user/:email', async (req, res) => {
            const email = req.params.email;
            const user = req.body;
            const filter = { email: email }
            const options = { upsert: true }
            const updateDoc = {
                $set: user
            };
            const result = await usersCollection.updateOne(filter, updateDoc, options)
            const token = jwt.sign({ email: email }, process.env.JWT_SECRET, { expiresIn: '1d' });
            // console.log()
            res.send({ result, token })
        })


        // orders apis 
        app.post('/order', verifyJWT, async (req, res) => {
            console.log('hello')
            const order = req.body;
            console.log(order)
            const result = await ordersCollection.insertOne(order)
            res.send(result)
        })
        app.get('/order', async (req, res) => {
            req.send('go corona')
        })

        app.get('/db', (req, res) => {
            res.send('Hello inside World!')
        })


    } finally {

    }

}

run().catch(console.dir);


app.get('/', (req, res) => {
    res.send('Hello World!')
})

app.listen(port, () => {
    console.log(`Example app listening on port ${port}`)
})