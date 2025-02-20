let button=document.getElementById('publish');
let userComment=document.querySelector('.userComment');

// ukoliko nije uneta poruka dugme ostaje disabled
userComment.addEventListener('input',e => {
    if(!userComment.value){ // ako nista nije uneto
        button.setAttribute('disabled','disabled');
        button.classList.remove('abled');
    } else {
        button.removeAttribute('disabled');
        button.classList.add('abled');
    }
});