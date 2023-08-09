const express = require("express");
const mongoose = require("mongoose");
const fs = require("fs");
const multer = require("multer");
const upload = multer({ dest: "uploads/" });
const session = require("express-session");
const app = express();
app.set("view engine", "ejs");
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static("uploads"));
app.use(function (req, res, next) {
  next();
});
app.use(
  session({
    secret: "it a session middleware",
    resave: true,
    saveUninitialized: true,
  })
);
mongoose.connect("mongodb://localhost:27017/trainingTodo", {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});
const db = mongoose.connection;

const todoSchema = new mongoose.Schema({
  text: String,
  iscompleted: Boolean,
  createdBy: String,
  imageName: String,
});

const userSchema = new mongoose.Schema({
  username: String,
  email: String,
  password: String,
});

const Todo = mongoose.model("Todo", todoSchema);
const User = mongoose.model("User", userSchema);

app.get("/", function (request, response) {
  if (request.session.isLoggedin) {
    response.render("index", { username: request.session.username });
    return;
  }
  response.redirect("/login");
});

app.get("/login", function (request, response) {
  if (request.session.isLoggedin) {
    response.redirect("/");
    return;
  }
  response.render("login", { error: null });
});

app.get("/signup", function (request, response) {
  if (request.session.isLoggedin) {
    response.redirect("/");
    return;
  }
  response.render("signup", { error: null });
});

app.get("/about", function (request, response) {
  if (request.session.isLoggedin) {
    response.render("about", { username: request.session.username });
    return;
  }
  response.redirect("/login");
});

app.get("/contact", function (request, response) {
  if (request.session.isLoggedin) {
    response.render("contact", { username: request.session.username });
    return;
  }
  response.redirect("/login");
});

app.get("/todo", function (request, response) {
  if (request.session.isLoggedin) {
    response.render("todo", { username: request.session.username });
    return;
  }
  response.redirect("/login");
});

app.get("/todo.js", function (request, response) {
  response.sendFile(__dirname + "/public/js/todo.js");
});
app.get("/todos", function (request, response) {
  const name = request.query.name;

  getTodos(name, false, function (error, todos) {
    if (error) {
      response.status(500);
      response.json({ error: error });
    } else {
      response.status(200);
      response.json(todos);
    }
  });
});
app.get("/user", function (req, response) {
  const user = req.session.username;
  response.status(200);
  response.json(user);
});

app.get("/logout", function (request, response) {
  if (request.session.isLoggedin) {
    request.session.destroy(function (error) {
      if (error) {
        response.status(500);
        response.send("Something went wrong please try later");
      } else {
        response.render("logout");
      }
    });
    return;
  }
  response.redirect("/login");
});

app.get("/error", function (request, response) {
  response.sendFile(__dirname + "/error.html");
});

app.post("/login", async function (request, response) {
  if(request.session.isLoggedin){
    response.redirect("/");
  }
  const username = request.body.username;
  const password = request.body.password;
  try {
    const user = await User.findOne({ username });
    if (!user) {
      return response.render("login", {
        error: "Username or password is incorrect",
      });
    }
    if (user.password !== password) {
      return response.render("login", {
        error: "Username or password is incorrect",
      });
    }
    request.session.isLoggedin=true;
    request.session.username=user.username;
    response.redirect("/");
  } 
  catch (error) {
    console.error("Error during login:", error);
    response.status(500).send("An error occurred during login.");
  }
});

app.post("/signup", async function (request, response) {
  const username = request.body.username;
  const email = request.body.email;
  const password = request.body.password;
  const existingName = await User.findOne({ username });
  const existingUser = await User.findOne({ email });
  if (existingName) {
    return response.render("signup", {
      error: "Username is already taken",
    });
  }
  if (existingUser) {
    return response.render("signup", {
      error: "Email address is already exist",
    });
  }
  const newUser = new User({
    username,
    email,
    password,
  });

  try {
    await newUser.save();
    response.redirect("login"); 
  } catch (error) {
    response.redirect("login");
    response.status(500).send('An error occurred while creating the user.');
  }
});

app.post("/todo", upload.single("image"), function (request, response) {
  let todo = JSON.parse(request.body.todo);
  const image = request.file;
  todo.imageName = image.filename;
  saveTodos(todo, function (error) {
    if (error) {
      response.status(500);
      response.json({ error: error });
    } else {
      response.status(200);
      response.send();
    }
  });
});
app.delete("/todo", async function (request, response) {
  const todo = request.body;
  const todoItem=await Todo.findOne({text: todo.text});
  const path = __dirname + "/uploads/" + todoItem.imageName;
  fs.unlink(path, function (error) {
    console.log(error);
  });
  Todo.deleteOne(todoItem)
  .then(function () {
    response.status(200);
    response.send();
  })
  .catch(function (error){
    response.status(500);
    response.json({ error: error });
  });
});

app.get("*", function (request, response) {
  response.render("404");
});
app.listen(8000, function () {
  console.log("Server is running on port 8000");
});

function getTodos(username, all, callback) {
  if (all) {
    Todo.find({})
      .then(todos=>{
        callback(null, filteredTodos);
      })
      .catch(error=>{
          callback(error);
      });
  } 
  else {
    Todo.find({ createdBy: username })
    .then(filteredTodos=>{
      callback(null, filteredTodos);
    })
    .catch(error=>{
        callback(error);
    });
  }
}

function saveTodos(todo, callback) {
  const todosJSON = JSON.stringify(todo);
  Todo.create(todo)
  .then(savedTodos => callback())
  .catch(err => callback(err));
}
app.post("/img", async function (request, response) {
  const todo = request.body;
  try {
    const todoData=await Todo.findOne({text:todo.text ,createdBy:todo.createdBy});
    const image=todoData.imageName;
    response.status(200);
    response.json(image);
  } catch (error) {
    if(error){
      response.status(500);
      response.json({ error: error });
    }
  }
});
app.post("/change", async function (request, response) {
  try {
    const todo = request.body;
    const todoData = await Todo.findOne({text:todo.text,createdBy:todo.createdBy});
    if(todoData.iscompleted){
      await Todo.findOneAndUpdate(todoData,{iscompleted:false});
    }
    else{
      await Todo.findOneAndUpdate(todoData,{iscompleted:true});
    }
  } catch (error) {
    response.status(500);
    response.json({ error: error });
  }
});
