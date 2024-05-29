const express = require('express')
const app = express()

const bcrypt = require('bcrypt')
const jwt = require('jsonwebtoken')

app.use(express.json())

const {open} = require('sqlite')
const sqlite3 = require('sqlite3')

const path = require('path')
const dbPath = path.join(__dirname, 'twitterClone.db')

let db = null
const initializeDBAndServer = async () => {
  try {
    db = await open({
      filename: dbPath,
      driver: sqlite3.Database,
    })
    app.listen(3000, () => {
      console.log('Server is Running at http://localhost:3000')
    })
  } catch (e) {
    console.log(`DB Error: ${e.message}`)
  }
}

initializeDBAndServer()

//jwttoken auth
const authenticateToken = (request, response, next) => {
  const {tweet} = request.body
  const {tweetId} = request.params
  let jwtToken
  const authHeader = request.headers['authorization']
  if (authHeader !== undefined) {
    jwtToken = authHeader.split(' ')[1]
  }
  if (jwtToken === undefined) {
    response.status(401)
    response.send('Invalid JWT Token')
  } else {
    jwt.verify(jwtToken, 'MY_SECRET_TOKEN', async (error, payload) => {
      console.log(payload)
      if (error) {
        response.status(401)
        response.send('Invalid JWT Token')
      } else {
        request.payload = payload
        request.tweetId = tweetId
        request.tweet = tweet
        next()
      }
    })
  }
}

//registration

app.post('/register', async (request, response) => {
  const {username, password, name, gender} = request.body
  const selectUserQuery = `SELECT * FROM user WHERE username = '${username}';`
  console.log(username, password, name, gender)
  const dbUser = await db.get(selectUserQuery)
  if (dbUser === undefined) {
    if (password.length < 6) {
      response.status(400)
      response.send('Password is too short')
    } else {
      const hashedPassword = await bcrypt.hash(password, 10)
      const createUserQuery = `
            INSERT INTO 
                user ( name, username, password, gender)
            VALUES(
                '${name}',
                '${username}',
                '${hashedPassword}',
                '${gender}'
            )    
         ;`

      await db.run(createUserQuery)
      response.status(200)
      response.send('User created successfully')
    }
  } else {
    response.status(400)
    response.send('User already exists')
  }
})

//login
app.post('/login', async (request, response) => {
  const {username, password} = request.body
  const selectUserQuery = `SELECT * FROM user WHERE username = '${username}';`
  console.log(username, password)
  const dbUser = await db.get(selectUserQuery)
  console.log(dbUser)
  if (dbUser === undefined) {
    response.status(400)
    response.send('Invalid user')
  } else {
    const isPasswordMatched = await bcrypt.compare(password, dbUser.password)
    if (isPasswordMatched === true) {
      const jwtToken = jwt.sign(dbUser, 'MY_SECRET_TOKEN')
      response.send({jwtToken})
    } else {
      response.status(400)
      response.send('Invalid password')
    }
  }
})

app.get('/user/tweets/feed', authenticateToken, async (request, response) => {
  const {payload} = request
  const {user_id, name, username, gender} = payload
  //console.log(name)
  const getTweetsFeedQuery = `
        SELECT 
            username,
            tweet,
            date_time AS dateTime
        FROM 
            follower INNER JOIN tweet ON follower.following_user_id = tweet.user_id INNER JOIN user ON user.user_id = follower.following_user_id
        WHERE 
            follower.follower_user_id = ${user_id}
        ORDER BY
            date_time DESC
        LIMIT 4    
            ;`

  const tweetFeedArray = await db.all(getTweetsFeedQuery)
  response.send(tweetFeedArray)
})

//Get User Following User NamesAPI-4
app.get('/user/following', authenticateToken, async (request, response) => {
  const {payload} = request
  const {user_id, name, username, gender} = payload
  console.log(name)
  const userFollowsQuery = `
        SELECT 
            name
        FROM 
            user INNER JOIN follower ON user.user_id = follower.following_user_id
        WHERE 
            follower.follower_user_id = ${user_id}    
        ;`

  const userFollowsArray = await db.all(userFollowsQuery)
  response.send(userFollowsArray)
})

//Get User Following User NamesAPI-4
app.get('/user/followers', authenticateToken, async (request, response) => {
  const {payload} = request
  const {user_id, name, username, gender} = payload
  console.log(name)
  const userFollowsQuery = `
        SELECT 
            name
        FROM 
            user INNER JOIN follower ON user.user_id = follower.follower_user_id
        WHERE 
            follower.following_user_id = ${user_id}    
        ;`

  const userFollowsArray = await db.all(userFollowsQuery)
  response.send(userFollowsArray)
})

