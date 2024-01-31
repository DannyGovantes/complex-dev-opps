const keys = require('./keys')
const express = require('express')
const bodyParser = require('body-parser')
const cors = require('cors')
const redis = require('redis')
const {Pool} = require('pg')

const app = express()

app.use(cors())
app.use(bodyParser.json())

const client = new Pool({
  user: keys.pgUser,
  host: keys.pgHost,
  database: keys.pgDatabase,
  password: keys.pgPassword,
  port: keys.pgPort,
  ssl: process.env.NODE_ENV !== 'production'? false : {rejectUnauthorized:false}
})

client.on('connect',(client)=>{
  client.query("CREATE TABLE IF NOT EXISTS values (number)INT")
  .catch((err)=> console.error(err))
})

const redisClient = redis.createClient({
  host: keys.redisHost,
  port : keys.redisPort,
  retry_strategy: ()=>1000
})

const redisPublisher = redisClient.duplicate()

app.get('/',(req,res)=>{
  res.send('h1')
})
app.get('/values/all',async(req,res)=>{
  const values = await client.query('SELECT * FROM values;')
  res.send(values.rows)
})
app.get('/values/current',async(req,res)=>{
  redisClient.hgetall('values',(err,values)=>{
    res.send(values)
  })
})
app.post('/values',async(req,res)=>{
  const {index} = req.body
  if(parseInt(index)>40){
    return res.status(422).send('Index too hgigh')
  }
  redisClient.hset('values', index, 'Nothing yey')
  redisPublisher.publish('insert',index)
  client.query('INSERT INTO values(number) VALUES($1);',[index])

  res.send({working:true})
});

app.listen(5000,err=>{
  console.log('Listening')
})