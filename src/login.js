//JS for Login purposes
import './sass/signin.scss';


import {
    login,
    handleIncomingRedirect,
    getDefaultSession,
    fetch
} from "@inrupt/solid-client-authn-browser";

window.PODURL = "";
export default window.PODURL;

document.getElementById('signinButton').addEventListener('click', function (e) {

    window.PODURL = document.getElementById("inputWebID").value;

    console.log(window.PODURL);





    if(window.PODURL) {
        loginToInruptDotCom();
    }
    else {
        console.log("Bitte WebID angeben!");
    }

})



// 1a. Start Login Process. Call login() function.
function loginToInruptDotCom() {
    console.log("Starte Login Prozess");
    let url = window.location.href;
    let oidc = document.getElementById("identityProvider").value;
    if(oidc !== -1) { //Only start login, if identity provider was selected

        return login({
            oidcIssuer: oidc,
            redirectUrl: url + "contact.html?URL=" +  window.PODURL, //Nach dem Login zum Dashboard der Anwendung wechseln
            clientName: "Arvato Systems - Blood Count Application"
        });
    }
}


