var express = require("express");
 var app = express();

 const frameguard = require('frameguard')
 app.use(frameguard({ action: 'sameorigin' }))
 
 /* serves main page */
 app.get("/", function(req, res) {
    res.sendfile('index.html')
 });
 
  app.post("/user/add", function(req, res) { 
	/* some server side logic */
	res.send("OK");
  });
 
 /* serves all the static files */
 app.get(/^(.+)$/, function(req, res){
     res.sendFile( __dirname + '/public/'+req.params[0],{},function(err){
     console.log(req.params[0]);
     if (err) {
       console.log("Missing:"+err.path);
       res.status(err.status).end();
     }
     else {
       console.log('Sent:', req.params[0]);
     }
  });
 });
 
 var port = process.env.PORT || 8080;
 app.listen(port, function() {
   console.log("Listening on " + port);
 });