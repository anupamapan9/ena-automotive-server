const express = require('express')
const app = express()
const port = process.env.PORT || 5000
const cors = require('cors');
const jwt = require('jsonwebtoken');
const { MongoClient, ServerApiVersion, Collection, ObjectId } = require('mongodb');

require('dotenv').config()
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

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
        const reviewsCollection = client.db('enaAutomotive').collection('reviews');
        // Database Collection  End -------------------



        // verify admin 
        const verifyAdmin = async (req, res, next) => {
            const requester = req.decoded.email;
            const requesterAccount = await usersCollection.findOne({ email: requester })
            if (requesterAccount.role === 'admin') {
                next()
            } else {
                res.status(403).send({ message: 'Forbidden Access' })
            }
        }
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

        app.get('/user', verifyJWT, verifyAdmin, async (req, res) => {
            const user = await usersCollection.find().toArray()
            res.send(user)
        })
        app.get('/user/:email', verifyJWT, async (req, res) => {
            const email = req.params.email;
            const filter = { email: email }
            const user = await usersCollection.findOne(filter)
            res.send(user)
        })


        app.put('/user/update/:email', verifyJWT, async (req, res) => {
            const email = req.params.email;
            const user = req.body;
            const filter = { email: email }
            const options = { upsert: true }
            const updateDoc = {
                $set: user
            };
            const result = await usersCollection.updateOne(filter, updateDoc, options)
            res.send(result)
        })
        // payment =============================


        app.post('/create-payment-intent', verifyJWT, async (req, res) => {
            const service = req.body;
            const price = service.price;
            const amount = price * 100;
            const paymentIntent = await stripe.paymentIntents.create({
                amount: amount,
                currency: 'usd',
                payment_method_types: ['card']
            });
            res.send({ clientSecret: paymentIntent.client_secret })
        });
        // admin   --------------------------------
        // make admin 
        app.put('/user/admin/:email', verifyJWT, verifyAdmin, async (req, res) => {
            const email = req.params.email;
            const filter = { email: email }
            const updateDoc = {
                $set: { role: 'admin' }
            };
            const result = await usersCollection.updateOne(filter, updateDoc)
            res.send(result)
        })

        app.get('/admin/:email', async (req, res) => {
            const email = req.params.email
            const user = await usersCollection.findOne({ email: email })
            const isAdmin = user.role === 'admin'
            res.send({ admin: isAdmin })
        })





        // products  ---***--- 
        app.get('/product', async (req, res) => {
            const query = {}
            const result = await productsCollection.find(query).toArray()
            res.send(result)
        })

        // upload a product 
        app.post('/product', verifyJWT, verifyAdmin, async (req, res) => {
            const product = req.body;
            const result = await productsCollection.insertOne(product)
            res.send(result)
        })
        app.get('/product/:id', verifyJWT, async (req, res) => {
            const id = req.params.id;
            const query = { _id: ObjectId(id) }
            const result = await productsCollection.findOne(query)
            res.send(result)
        })
        app.put('/product/:id', verifyJWT, async (req, res) => {
            const id = req.params.id;
            const product = req.body;
            const filter = { _id: ObjectId(id) }
            const options = { upsert: true }
            const updateDoc = {
                $set: product
            };
            const result = await productsCollection.updateOne(filter, updateDoc, options)
            res.send(result)
        })

        app.delete('/product/:id', verifyJWT, async (req, res) => {
            const id = req.params.id;
            const query = { _id: ObjectId(id) }
            const result = await productsCollection.deleteOne(query)
            res.send(result)
        })
        // orders apis -------------------------
        app.post('/order', verifyJWT, async (req, res) => {
            const order = req.body;
            const result = await ordersCollection.insertOne(order)
            res.send(result)
        })
        app.get('/order/:email', verifyJWT, async (req, res) => {
            const email = req.params.email;
            const query = { orderer: email }
            const result = await ordersCollection.find(query).toArray()
            res.send(result)
        })
        app.get('/ordered/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: ObjectId(id) }
            const result = await ordersCollection.findOne(query)
            res.send(result)
        })

        app.delete('/order/:id', verifyJWT, async (req, res) => {
            const id = req.params.id;
            const query = { _id: ObjectId(id) }
            const result = await ordersCollection.deleteOne(query)
            res.send(result)
        })
        // review -------------------************************

        app.post('/review', verifyJWT, async (req, res) => {
            const review = req.body;
            const result = await reviewsCollection.insertOne(review)
            res.send(result)
        })

        app.get('/review', async (req, res) => {
            const query = {}
            const result = await reviewsCollection.find(query).toArray()
            const newestReview = result.reverse()
            res.send(newestReview)
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