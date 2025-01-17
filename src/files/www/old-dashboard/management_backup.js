
// JSON object for users
let users = [
    {
        username: 'loading ...',
        password: 'loading ...',
        blockInternetAccess: false,
    }
]
let fetch_users= []
var ubus_call_id=1
var token=localStorage.getItem("routro_token");

function ubus_call(params,cb){

    ubus_call_id++;
    var body={
        "jsonrpc": "2.0",
        "id": ubus_call_id,
        "method": "call",
        "params":[
            token
        ]
    }
    for (param of params){
        body["params"].push(param);
    }

    // create XMLHttpRequest object
    const xhr = new XMLHttpRequest();
    xhr.open("POST", "http://192.168.151.1/ubus");
    xhr.setRequestHeader("Content-Type", "application/json");
    xhr.send(JSON.stringify(body));

    xhr.onload = function() {
        if (xhr.status === 200) {
            //parse JSON datax`x
            var resBody = JSON.parse(xhr.responseText);

            if (resBody["result"]){
                cb(resBody["result"]);
            }
            else{
                window.location.href = "index.html";
            }
        } 
        else {
          console.log("XHR was failed")
        }
    }
    xhr.onerror = function() {
        loading(false);
        console.log("Network error occurred")
    }
}


function transformValuesToObject(values) {
    const users = [];

    for (const key in values) {
        const user = {
            username: key,
            password: values[key].password, // Assuming the password is the same as the username
            blockInternetAccess: values[key].block || false,
        };

        users.push(user);
    }

    return users;
}

const inputValues = {
    "captive": {
        ".anonymous": false,
        ".type": "users",
        ".name": "captive",
        ".index": 0,
        "username": "password",
        "block": true
    },
    "captive2": {
        ".anonymous": false,
        ".type": "users",
        ".name": "captive",
        ".index": 0,
        "username": "password2"
    }
};





// Function to render the user list
function renderUserList() {
    const userList = document.getElementById('userList');
    userList.innerHTML = '';
    users.forEach(user => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${user.username}</td>
            <td>${user.password}</td>
            <td>${user.blockInternetAccess == "true" ? 'Yes' : 'No'}</td>
            <td>
                <button onclick="editUser('${user.username}')" type="button">Edit</button>
                <button onclick="deleteUser('${user.username}')" type="button">Delete</button>
            </td>
        `;
        userList.appendChild(row);
    });
}

// Function to edit a user
function editUser(username) {
    // Find the user by username
    const user = users.find(u => u.username === username);
    if (user) {
        // Populate the form fields with user data
        document.getElementById('newUsername').value = user.username;
        document.getElementById('newPassword').value = user.password;
        document.querySelector(`input[name="blockInternetAccess"][value="${user.blockInternetAccess ? 'Yes' : 'No'}"]`).checked = true;
    }
}

// Function to delete a user
function deleteUser(username) {
    // Find the user index by username
    const userIndex = users.findIndex(u => u.username === username);
    if (userIndex !== -1) {
        // Remove the user from the array
        users.splice(userIndex, 1);
        // Update the user list
        renderUserList();
    }
}

// Function to add a user
function addUser() {
    const newUsername = document.getElementById('newUsername').value;
    const newPassword = document.getElementById('newPassword').value;
    const blockInternetAccess = document.querySelector('input[name="blockInternetAccess"]:checked').value === 'Yes';
    
    // Check for duplicate username
    const existingUser = users.find(u => u.username === newUsername);
    if (existingUser) {
        // Replace the existing user's data
        existingUser.password = newPassword;
        existingUser.blockInternetAccess = blockInternetAccess;
    } else {
        // Add the new user
        users.push({
            username: newUsername,
            password: newPassword,
            blockInternetAccess: blockInternetAccess,
        });
    }

    // Update the user list
    renderUserList();
    // Clear the input fields
    document.getElementById('newUsername').value = '';
    document.getElementById('newPassword').value = '';
}

const UCI_GET_USERS=["uci", "get", {"config":"users"}]
const UCI_SET_USERS=["uci", "set", {"config":"users"}]
const UCI_ADD_USERS=["uci", "add", {"config":"users"}]
const UCI_DEL_USERS=["uci", "delete", {"config":"users"}]
const UCI_COMMIT=["uci", "commit", {"config":"---"}];

// Function to read data
function reloadData() {
    ubus_call(UCI_GET_USERS,function(chunk){
        console.log(chunk[1]);
        if(chunk[1]){
            users = transformValuesToObject(chunk[1]["values"]);
            fetch_users = Object.assign([],users);
            renderUserList();
            console.log(users);    
        }
    })
}

function SaveIN(){
    users.forEach(element => {

        var new_param = [];
        
        var params = {
            "values" : {
                password: element.password,
                block: element.blockInternetAccess
            }
        }

        if ( isUsernameInArray(element.username,fetch_users) ){
            params["section"] = element.username;
            new_param = UCI_SET_USERS;
        }else{
            params["type"] = "users";
            params["name"] = element.username;
            new_param = UCI_ADD_USERS;
        }

        new_param[2] = Object.assign(new_param[2],params);
            
        ubus_call(new_param,function(chunk){
            if(chunk[0] == 0){
                var commit_param=UCI_COMMIT;
                commit_param[2]["config"]=new_param[2]["config"];
                ubus_call(commit_param,function(chunk2){
                    console.log(chunk2)
                })
            }
        })

    });

    fetch_users.forEach(element => {
        if(!isUsernameInArray(element.username,users)){
            var new_param = UCI_DEL_USERS;
            var params = {
                "section":element.username
            }
            new_param[2] = Object.assign(new_param[2],params);
            ubus_call(new_param,function(chunk){
                if(chunk[0] == 0){
                    var commit_param=UCI_COMMIT;
                    commit_param[2]["config"]=new_param[2]["config"];
                    ubus_call(commit_param,function(chunk2){
                        console.log(chunk2)
                    })
                }
            })

        }
    })
}
function isUsernameInArray(usernameToCheck, arrayToSearch) {
    return arrayToSearch.some(item => item.username === usernameToCheck);
}
// Initial rendering of user list
reloadData()
//renderUserList();