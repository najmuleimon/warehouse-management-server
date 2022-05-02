const express = require('express');
const cors = require('cors');
require('dotenv').config();
const jwt = require('jsonwebtoken');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const port = process.env.PORT || 5000;

const app = express();
app.use(cors());
app.use(express.json());

function verifyJWT(req, res, next){
  const authHeader = req.headers.authorization;
  if (!authHeader) {
      return res.status(401).send({ message: 'unauthorized access' });
  }
  const token = authHeader.split(' ')[1];
  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
      if (err) {
          return res.status(403).send({ message: 'Forbidden access' });
      }
      console.log('decoded', decoded);
      req.decoded = decoded;
      next();
  })
}

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.5tt4v.mongodb.net/myFirstDatabase?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });


async function run(){
  try{
    await client.connect();
    const productCollection = client.db('proTech').collection('product');

    // jwt auth
    app.post('/login', async(req, res) => {
      const user = req.body;
      const accessToken = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, {
          expiresIn: '1d'
      });
      res.send({accessToken});
    })

    // get all products
    app.get('/all-products', async(req, res) => {
      const query = {};
      const cursor = productCollection.find(query);
      const products = await cursor.toArray();
      res.send(products);
    });

    // get 6 products
    app.get('/products', async(req, res) => {
      const query = {};
      const cursor = productCollection.find(query);
      const products = await cursor.limit(6).toArray();
      res.send(products);
    });

    // get single product
    app.get('/product/:id', async(req, res) => {
      const id = req.params.id;
      const query = { _id: ObjectId(id) };
      const product = await productCollection.findOne(query);
      res.send(product);
    })

    // get added product
    app.get('/my-product', verifyJWT, async(req, res) => {
      const decodedEmail = req.decoded.email;
      const email = req.query.email;

      if(email === decodedEmail){
        const query = {email:email};
        const cursor = productCollection.find(query);
        const myProducts = await cursor.toArray();
        res.send(myProducts);
      }
      else{
        res.status(403).send({message: 'forbidden access'})
      }
  })

    // insert a product
    app.post('/upload', async(req, res) => {
      const product = req.body;
      const result = await productCollection.insertOne(product);
      res.send(result);
    })

    // update quantity
    app.put('/product/:id', async(req, res) => {
      const deliveredProduct = req.body;
      const id = req.params.id;
      const filter = {_id: ObjectId(id)};
      const options = { upsert: true };

      const updateDoc = {
          $set: {
            quantity: deliveredProduct.quantity
          }
        };
        const result = await productCollection.updateOne(filter, updateDoc, options);
        res.send(result);
    })

    // delete product
    app.delete('/product/:id', async(req, res) => {
      const id = req.params.id;
      const query = {_id: ObjectId(id)};
      const result = await productCollection.deleteOne(query);
      res.send(result);
    })


  }
  finally{

  }
}
run().catch(console.dir);


app.get('/', (req, res) => {
    res.send('Running warehouse server');
})
app.listen(port, () => {
    console.log('Listening to port', port);
})