
import express from 'express'
import cors from 'cors'

const app = express()
const PORT = 3000
const api =' http://4.224.186.213'
app.use(cors())
app.use(express.json())


app.post('/register', (req, res) => {
   
    const { email, name, mobile, github, rollnumber, acessCode } = req.body
    fetch(`${api}/evaluation-service/register`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({  
            email,
            name,
            mobile,     
            github,
            rollnumber,
            acessCode  
        })
      })
        .then((response) => response.json())
        .then((data) => res.json(data))
        .catch(() => res.status(500).json({ error: 'Registration failed.' }))




})

app.get('/test', (req, res) => {
    res.send('Test endpoint is working! baibhav')
})




app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`)
})