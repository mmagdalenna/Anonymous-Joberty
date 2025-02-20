const express=require('express');
const path=require('path');
const ClientRouter=require('./routers/client');

const app=express();

app.use(function (err,req,res,next) {
    console.log('GRESKA');
});

app.use(express.static(path.join(__dirname,"public_client")));
app.use(express.urlencoded({extended:true}));

app.set('viewengine','ejs');
app.set('views','views/');

app.use(ClientRouter);

module.exports=app;