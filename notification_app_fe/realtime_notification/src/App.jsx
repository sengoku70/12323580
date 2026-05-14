import { useState, useEffect } from 'react'
import './App.css'

function App() {
  const [notifications, setNotifications] = useState([])
  const [newMessage, setNewMessage] = useState([])
  const [error, setError] = useState(null)
  const [testdata,settestdata] = useState(false)


  
useEffect(() => {
  // create a fetch to api/register and send a json request body like {"email": " ramkrishna"@abc.edu",name": "Ram Krishna" ,mobile": "9999999999",github": "github",rollnumber": "aa1bb",acessCode": "xgAsNc" }  
  fetch('http://localhost:3000/register', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      email: 'ramkrishna@abc.edu',
      name: 'Ram Krishna',
      mobile: '9999999999',
      github: 'github',
      rollnumber: 'aa1bb',
      acessCode: 'xgAsNc'
    })
  })
    .then((response) => response.json())
    .then((data) => setNewMessage(data))
    .catch(() => setError('Registration failed.'))

}, [newMessage]);
 



  return (
    <div className="app-container">


      <h1>{newMessage}</h1>

    </div>
  )
}

export default App
