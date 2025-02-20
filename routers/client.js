const express=require('express');
const fsPromises=require('fs/promises');
const path=require('path');
let {Identity}=require('@semaphore-protocol/identity');
let {Group}=require('@semaphore-protocol/group');
let {generateProof}=require('@semaphore-protocol/proof');
let {verifyProof}=require('@semaphore-protocol/proof');

const router=express.Router();

async function recordReview(message){
    await fsPromises.appendFile('./postedReviews',message,{encoding:'utf-8'});
}

/*async function readRecordedReviews(){
    let text=await fsPromises.readFile('./postedReviews',{encoding:'utf-8'});
    let messages=text.split('\n');
    return messages;
}*/

// ------ 
const commitmentsFilePath='generateInputs/companyCommitments.txt';
// localy saved list of nullifiers required from verified proofs
const nullifiersPath='./validNullifiers.txt';

async function readFile(path){
    let data=await fsPromises.readFile(path,{encoding:'utf-8'});
    return data;
}

async function writeFile(path,data){
    let word=data+'\n';
    await fsPromises.appendFile(path,word,{encoding:'utf-8'});
}

async function main(userPrivateKey,userMessage){
    let data=await readFile(commitmentsFilePath);
    //console.log(data);
    let commitments=data.split('\n');
    commitments=commitments.map((elem)=>BigInt(elem));
    //console.log(commitments); 
    
    const group=new Group(commitments);

    let privateKey=userPrivateKey;    
    let userIdentity=new Identity(privateKey.toString());
    let userCommitment=userIdentity.commitment;

    let canLeaveReview=false;
    let alreadyLeftReview=false;

    if(group.indexOf(userCommitment)!=-1){
        console.log('User is a member of the group and can potentially leave a review!');
    
        const scope=group.root;
        const message=userMessage;

        // generating the proof
        const proof=await generateProof(userIdentity,group,message,scope);
        let nullifier=proof.nullifier;
        //console.log(nullifier,typeof nullifier); nullifier je string
        console.log('Nullifier je '+nullifier);

        let nullifiers=await readFile(nullifiersPath);
        nullifiers=nullifiers.split('\n');
        console.log('List of valid nullifiers:',nullifiers);        
        
        // proveravamo da li je korisnik vec ostavio recenziju ->
        // ako jeste onda je njegov nullifier zapamcen u validNullifiers.txt
        if(nullifiers.includes(nullifier)){
            console.log('User already left a revies! SPAM IS FORBBIDEN!');
            alreadyLeftReview=true;
        }else{
            // verifying th proof
            let ret=await verifyProof(proof);
            console.log(ret);

            if(ret){
                canLeaveReview=true;
                // proof is valid
                console.log('Writing to a file...');

                await writeFile(nullifiersPath,nullifier)
                    .then(()=> console.log('Nullifier is recorded'))
                    .catch((err)=>console.error(err));

                console.log('Writing is finished.');
            } else {
                // proof is not valid
                console.log('Proof is not valid!')
            }
            
        }
        
    }else{
        console.log('User CANNOT leave a review.');
    }

    let retObj={ 
            canLeaveReview:canLeaveReview,
            alreadyLeftReview:alreadyLeftReview
        };
    return retObj;
}
// ---

let commentNumber=2;

router.post('/review', function (req,res,next){
    const data=req.body;
    const privateKey=data.privateKey;
    const message=data.message;

    let keyValid=true;
    if(privateKey===""){
        keyValid=false;
    }

    let isValid; // true ili false u zavisnosti rezultata provere sa semaforima
                 // da li dodajemo trenutnu recenziju u sve komentare
    let alreadyLeftReview;

    main(privateKey,message)
        //.then((retObj)=>console.log(retObj))
        .then( function(retObject) {
            isValid=retObject.canLeaveReview;
            alreadyLeftReview=retObject.alreadyLeftReview;
            console.log('Ret object');

            // tu cela obrada?!?!?
            if(isValid && keyValid){
                // record this review in a file containing all previous valid reviews
                recordReview(message+"\n");
                commentNumber+=1;
        
            }
            if(commentNumber==2 && (!keyValid || !isValid)){
                res.render('response.ejs',{
                    keyValid:keyValid,
                    isValid:isValid,
                    alreadyLeftReview:alreadyLeftReview,
                    commentNumber:commentNumber,
                    messages:[]
                });
            }else{
                fsPromises.readFile('./postedReviews',{encoding:'utf-8'})
                        .then( function (data){
                            let messages=data.split('\n');
                            console.log(messages);
                            let last=messages.pop();
        
                            res.render('response.ejs',{
                                keyValid:keyValid,
                                isValid:isValid,
                                alreadyLeftReview:alreadyLeftReview,
                                commentNumber:commentNumber,
                                messages:messages
                            });
                        })
                        .catch((err)=> console.error('Error while reading postedReviews.'));
            }
        })
        .catch((err)=>console.error('Jebes ti meni sve'));
                 
                 
    //isValid=true;
    /*if(isValid && keyValid){
        // NIJE LOSE SAMO MORAM DA ZAPAMTIM SVE VALIDNE PORUKE
        /*res.render('response.ejs',{
            isValid:isValid,
            message:message
        });*/

        // record this review in a file containing all previous valid reviews
        /*recordReview(message+"\n");
        commentNumber+=1;

    }*/

    // problem ako je prvi test primer sa praznim privateKey-om
    // ne postoji postedReviews fajl (ili je prazan)
    /*if(commentNumber==2 && (!keyValid || !isValid)){
        res.render('response.ejs',{
            keyValid:keyValid,
            isValid:isValid,
            alreadyLeftReview:alreadyLeftReview,
            commentNumber:commentNumber,
            messages:[]
        });
    }else{
        fsPromises.readFile('./postedReviews',{encoding:'utf-8'})
                .then( function (data){
                    let messages=data.split('\n');
                    console.log(messages);
                    let last=messages.pop();

                    res.render('response.ejs',{
                        keyValid:keyValid,
                        isValid:isValid,
                        alreadyLeftReview:alreadyLeftReview,
                        commentNumber:commentNumber,
                        messages:messages
                    });
                })
                .catch((err)=> console.error('Error while reading postedReviews.'));
    }*/
});

module.exports=router;