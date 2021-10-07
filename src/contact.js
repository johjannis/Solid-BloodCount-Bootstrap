//JS for BloodCount Dashboard

import 'bootstrap';
import 'jquery';
import './sass/styles.scss';

import './sass/dashboard.scss';

import {
    login,
    handleIncomingRedirect,
    getDefaultSession,
    fetch
} from "@inrupt/solid-client-authn-browser";

import {
    createSolidDataset,
    createThing,
    setThing,
    addUrl,
    addStringNoLocale,
    saveSolidDatasetAt,
    getSolidDataset,
    getThingAll,
    getStringNoLocale,
    access,
    deleteSolidDataset,
    getSolidDatasetWithAcl,
    getPublicAccess,
    getAgentAccessAll, createAcl, setAgentResourceAccess

} from "@inrupt/solid-client";



import { SCHEMA_INRUPT, RDF, AS } from "@inrupt/vocab-common-rdf";
import {
    setAgentAccess,
} from "@inrupt/solid-client";

var globalBloodCountUrl;

// 1b. Login Redirect. Call handleIncomingRedirect() function.
// When redirected after login, finish the process by retrieving session information.
async function handleRedirectAfterLogin() {

    await handleIncomingRedirect();
    const session = getDefaultSession();
    if (session.info.isLoggedIn) {
        console.log("Session erfolgreich gestartet")

            const queryString = window.location.search;
            const urlParams = new URLSearchParams(queryString);
            const webid = urlParams.get('URL');

            console.log(webid);
            globalBloodCountUrl = `${webid}/private/blood_counts/`;

            await getAllBloodCounts();
            await fetchPermissions();

    } else {
        console.log("Session-Fehler!");
    }
}

handleRedirectAfterLogin();

document.getElementById('finishAddBC').addEventListener('click', function () {
    createBCList();
})

document.getElementById('finishAddBC').addEventListener('click', function () {
    createBCList();
})


async function getAllBloodCounts() {
    //Alle Blutbilder aus dem Solid Pod anfragen

    var savedBloodCountList = await getSolidDataset(
        globalBloodCountUrl,
        { fetch: fetch }
    );

    var i = 0; //Zähler für Schleife aller Blutwerte
    var maxDate = new Date("1999-01-01"); //initiales Datum
    var newestBC = "";

    $('#accordionBloodCount').empty(); //Bei Neuladen der Seite, bisherige Elemente löschen

    for (var bloodCount in savedBloodCountList.graphs.default) {

        if(i !== 0) { //Erster Eintrag des Ergebnisses ist lediglich eine Information des Containers

            var currentEntry = await getBloodCount(bloodCount);
            var hashedBloodCount = bloodParameterHash(currentEntry);
            var date = bloodCount.slice(-10);
            var dateFormatted = new Date(date);

            if(dateFormatted > maxDate) { //das neuste Blutbild über das Datum herausfinden
                maxDate = dateFormatted;
                newestBC = bloodCount;
            }

            var entryAsHTML = getBloodCountAsHTML (hashedBloodCount, i, date);
            var dom = document.getElementById("accordionBloodCount");

            dom.insertAdjacentHTML('beforeend', entryAsHTML);

            document.getElementById('deleteBC_' + date).addEventListener('click', function (e) {
                deleteBloodCount(this.id);
            })
        }
        i++;
    }
    setNewestBC(newestBC); //Oben in der Anwendung sollen die aktuellsten Werte dargestellt werden
}




async function getBloodCount(url) {
    // Refetch the Reading List
    var savedBloodCountList = await getSolidDataset(
        url,
        { fetch: fetch }
    );


    let items = getThingAll(savedBloodCountList);

    let listcontent = "";
    for (let i = 0; i < items.length; i++) {
        let item = getStringNoLocale(items[i], SCHEMA_INRUPT.name);
        if (item != null) {
            listcontent += item + "\n";
        }
    }
    console.log(listcontent);
    return listcontent;
}

function bloodParameterHash(bloodString) { //Übergibt das Blutbild als Array zurück
    var splitString = bloodString.split(";");
    var bloodParamsHashed = {};
    for (var z in splitString) {
        var y = splitString[z].split(":");
        bloodParamsHashed[y[0]] = y[1];
    }
    return bloodParamsHashed;
}

async function createBCList() {

    var bloodCountUrl = globalBloodCountUrl;


    // get blood count inputs
    var items = [];
    var date = jQuery('#addBloodCountDate').val();
    var rows = jQuery("#modal-bodyAddBC");
    var inputs = rows.find('input[type="number"]');

    jQuery.each(inputs, function (index, element) {
        items.push(this.value);
    })

    jQuery.each(inputs, function (index, element) {
        this.value = "";
    })

    //change file name of current blood count
    bloodCountUrl += "date-" + date;

    let myBloodCountList = createSolidDataset();

    let bloodCountThing = createThing({ name: "date-" + date });
    bloodCountThing = addUrl(bloodCountThing, RDF.type, AS.Article);
    bloodCountThing = addStringNoLocale(bloodCountThing, SCHEMA_INRUPT.name, bloodCount2String(items));
    myBloodCountList = setThing(myBloodCountList, bloodCountThing);

    try {

        // Save the SolidDataset
        let savedBloodCountList = await saveSolidDatasetAt(
            bloodCountUrl,
            myBloodCountList,
            { fetch: fetch }
        );

        // Refetch the BloodCount List
        savedBloodCountList = await getSolidDataset(
            bloodCountUrl,
            { fetch: fetch }
        );

        let items = getThingAll(savedBloodCountList);

        let listcontent = "";
        for (let i = 0; i < items.length; i++) {
            let item = getStringNoLocale(items[i], SCHEMA_INRUPT.name);
            if (item != null) {
                listcontent += item + "\n";
            }
        }

        await getAllBloodCounts();


    } catch (error) {
        console.log(error);

    }
}

async function deleteBloodCount (buttonId) {
    var bloodCount = globalBloodCountUrl + "date-" +buttonId.slice(-10);

    try {

        await deleteSolidDataset(
            bloodCount,
            {fetch: fetch}
        );

        getAllBloodCounts();

    }catch (error) {
        console.log(error);
    }
}

function bloodCount2String(items) {
    return "RBC:" + items[0] + ";" +
        "WBC:" + items[1] + ";" +
        "TC:" + items[2] + ";" +
        "HCT:" + items[3] + ";" +
        "HB:" + items[4] + ";" +
        "MCV:" + items[5] + ";" +
        "MCH:" + items[6] + ";" +
        "MCHC:" + items[7] + ";";
}

async function fetchPermissions() {

    const bloodCountWithAcl = await getSolidDatasetWithAcl(globalBloodCountUrl, {fetch: fetch});
    const accessByAgent = await getAgentAccessAll(bloodCountWithAcl);

    setAgentPermission("https://pod.inrupt.com/jannis/profile/card#me", "read");
}

async function setAgentPermission (agentID ,pPermissionType) {

    const bloodCountWithAcl = await getSolidDatasetWithAcl(globalBloodCountUrl, {fetch: fetch});
    switch(pPermissionType) {
        case "read":
            await setAgentAccess(globalBloodCountUrl, agentID, {read: true});
            break;
        case "write":
            await setAgentAccess(globalBloodCountUrl, agentID, {read: true},{ write: true});
            break;
    }
}

async function setNewestBC(newestBC) {
   var currentEntry = await getBloodCount(newestBC);
   var hashedBloodCount = bloodParameterHash(currentEntry);

    var htmlText =
        '      <div class="row mt-3">'+
        '        <div class="col-md-6 col-xl-3 mb-4">'+
        '          <div class="card shadow border-start-primary py-2">'+
        '            <div class="card-body">'+
        '              <div class="row align-items-center no-gutters">'+
        '                <div class="col me-2">'+
        '                  <div class="text-uppercase text-primary fw-bold text-xs mb-1"><span>Erythrozyten</span></div>'+
        '                  <div class="text-dark fw-bold h5 mb-0"><span id="valueErythrozyten">' + hashedBloodCount["RBC"] +' Mio./µl</span></div>'+
        '                </div>'+
        '                <div class="col-auto"><svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" fill="currentColor" viewBox="0 0 16 16" class="bi bi-arrow-up-square fa-2x text-gray-300">'+
        '                  <path fill-rule="evenodd" d="M15 2a1 1 0 0 0-1-1H2a1 1 0 0 0-1 1v12a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V2zM0 2a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2V2zm8.5 9.5a.5.5 0 0 1-1 0V5.707L5.354 7.854a.5.5 0 1 1-.708-.708l3-3a.5.5 0 0 1 .708 0l3 3a.5.5 0 0 1-.708.708L8.5 5.707V11.5z"></path>'+
        '                </svg></div>'+
        '              </div>'+
        '            </div>'+
        '          </div>'+
        '        </div>'+
        '        <div class="col-md-6 col-xl-3 mb-4">'+
        '          <div class="card shadow border-start-primary py-2">'+
        '            <div class="card-body">'+
        '              <div class="row align-items-center no-gutters">'+
        '                <div class="col me-2">'+
        '                  <div class="text-uppercase text-primary fw-bold text-xs mb-1"><span>Leukozyten</span></div>'+
        '                  <div class="text-dark fw-bold h5 mb-0"><span id="valueLeukozyten">' + hashedBloodCount["WBC"] +' Tsd./µl</span></div>'+
        '                </div>'+
        '                <div class="col-auto"><svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" fill="currentColor" viewBox="0 0 16 16" class="bi bi-arrow-up-square fa-2x text-gray-300">'+
        '                  <path fill-rule="evenodd" d="M15 2a1 1 0 0 0-1-1H2a1 1 0 0 0-1 1v12a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V2zM0 2a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2V2zm8.5 9.5a.5.5 0 0 1-1 0V5.707L5.354 7.854a.5.5 0 1 1-.708-.708l3-3a.5.5 0 0 1 .708 0l3 3a.5.5 0 0 1-.708.708L8.5 5.707V11.5z"></path>'+
        '                </svg></div>'+
        '              </div>'+
        '            </div>'+
        '          </div>'+
        '        </div>'+
        '        <div class="col-md-6 col-xl-3 mb-4">'+
        '          <div class="card shadow border-start-primary py-2">'+
        '            <div class="card-body">'+
        '              <div class="row align-items-center no-gutters">'+
        '                <div class="col me-2">'+
        '                  <div class="text-uppercase text-primary fw-bold text-xs mb-1"><span>Thrombozyten</span></div>'+
        '                  <div class="text-dark fw-bold h5 mb-0"><span id="valueThrombozyten">' + hashedBloodCount["TC"] +' Tsd./µl</span></div>'+
        '                </div>'+
        '                <div class="col-auto"><svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" fill="currentColor" viewBox="0 0 16 16" class="bi bi-arrow-up-square fa-2x text-gray-300">'+
        '                  <path fill-rule="evenodd" d="M15 2a1 1 0 0 0-1-1H2a1 1 0 0 0-1 1v12a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V2zM0 2a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2V2zm8.5 9.5a.5.5 0 0 1-1 0V5.707L5.354 7.854a.5.5 0 1 1-.708-.708l3-3a.5.5 0 0 1 .708 0l3 3a.5.5 0 0 1-.708.708L8.5 5.707V11.5z"></path>'+
        '                </svg></div>'+
        '              </div>'+
        '            </div>'+
        '          </div>'+
        '        </div>'+
        '        <div class="col-md-6 col-xl-3 mb-4">'+
        '          <div class="card shadow border-start-primary py-2">'+
        '            <div class="card-body">'+
        '              <div class="row align-items-center no-gutters">'+
        '                <div class="col me-2">'+
        '                  <div class="text-uppercase text-primary fw-bold text-xs mb-1"><span>Hämatokrit</span></div>'+
        '                  <div class="text-dark fw-bold h5 mb-0"><span id="valueHämatokrit">' + hashedBloodCount["HCT"] +' %</span></div>'+
        '                </div>'+
        '                <div class="col-auto"><svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" fill="currentColor" viewBox="0 0 16 16" class="bi bi-arrow-up-square fa-2x text-gray-300">'+
        '                  <path fill-rule="evenodd" d="M15 2a1 1 0 0 0-1-1H2a1 1 0 0 0-1 1v12a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V2zM0 2a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2V2zm8.5 9.5a.5.5 0 0 1-1 0V5.707L5.354 7.854a.5.5 0 1 1-.708-.708l3-3a.5.5 0 0 1 .708 0l3 3a.5.5 0 0 1-.708.708L8.5 5.707V11.5z"></path>'+
        '                </svg></div>'+
        '              </div>'+
        '            </div>'+
        '          </div>'+
        '        </div>'+
        '      </div>'+
        '      <div class="row">'+
        '        <div class="col-md-6 col-xl-3 mb-4">'+
        '          <div class="card shadow border-start-primary py-2">'+
        '            <div class="card-body">'+
        '              <div class="row align-items-center no-gutters">'+
        '                <div class="col me-2">'+
        '                  <div class="text-uppercase text-primary fw-bold text-xs mb-1"><span>Hämoglobin</span></div>'+
        '                  <div class="text-dark fw-bold h5 mb-0"><span id="valueHämoglobin">' + hashedBloodCount["HB"] +' g/dl</span></div>'+
        '                </div>'+
        '                <div class="col-auto"><svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" fill="currentColor" viewBox="0 0 16 16" class="bi bi-arrow-up-square fa-2x text-gray-300">'+
        '                  <path fill-rule="evenodd" d="M15 2a1 1 0 0 0-1-1H2a1 1 0 0 0-1 1v12a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V2zM0 2a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2V2zm8.5 9.5a.5.5 0 0 1-1 0V5.707L5.354 7.854a.5.5 0 1 1-.708-.708l3-3a.5.5 0 0 1 .708 0l3 3a.5.5 0 0 1-.708.708L8.5 5.707V11.5z"></path>'+
        '                </svg></div>'+
        '              </div>'+
        '            </div>'+
        '          </div>'+
        '        </div>'+
        '        <div class="col-md-6 col-xl-3 mb-4">'+
        '          <div class="card shadow border-start-primary py-2">'+
        '            <div class="card-body">'+
        '              <div class="row align-items-center no-gutters">'+
        '                <div class="col me-2">'+
        '                  <div class="text-uppercase text-primary fw-bold text-xs mb-1"><span>MCV</span></div>'+
        '                  <div class="text-dark fw-bold h5 mb-0"><span id="valueMCV">' + hashedBloodCount["MCV"] +' Femtoliter</span></div>'+
        '                </div>'+
        '                <div class="col-auto"><svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" fill="currentColor" viewBox="0 0 16 16" class="bi bi-arrow-up-square fa-2x text-gray-300">'+
        '                  <path fill-rule="evenodd" d="M15 2a1 1 0 0 0-1-1H2a1 1 0 0 0-1 1v12a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V2zM0 2a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2V2zm8.5 9.5a.5.5 0 0 1-1 0V5.707L5.354 7.854a.5.5 0 1 1-.708-.708l3-3a.5.5 0 0 1 .708 0l3 3a.5.5 0 0 1-.708.708L8.5 5.707V11.5z"></path>'+
        '                </svg></div>'+
        '              </div>'+
        '            </div>'+
        '          </div>'+
        '        </div>'+
        '        <div class="col-md-6 col-xl-3 mb-4">'+
        '          <div class="card shadow border-start-primary py-2">'+
        '            <div class="card-body">'+
        '              <div class="row align-items-center no-gutters">'+
        '                <div class="col me-2">'+
        '                  <div class="text-uppercase text-primary fw-bold text-xs mb-1"><span>MCH</span></div>'+
        '                  <div class="text-dark fw-bold h5 mb-0"><span id="valueMCH">' + hashedBloodCount["MCH"] +' Pikogramm</span></div>'+
        '                </div>'+
        '                <div class="col-auto"><svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" fill="currentColor" viewBox="0 0 16 16" class="bi bi-arrow-up-square fa-2x text-gray-300">'+
        '                  <path fill-rule="evenodd" d="M15 2a1 1 0 0 0-1-1H2a1 1 0 0 0-1 1v12a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V2zM0 2a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2V2zm8.5 9.5a.5.5 0 0 1-1 0V5.707L5.354 7.854a.5.5 0 1 1-.708-.708l3-3a.5.5 0 0 1 .708 0l3 3a.5.5 0 0 1-.708.708L8.5 5.707V11.5z"></path>'+
        '                </svg></div>'+
        '              </div>'+
        '            </div>'+
        '          </div>'+
        '        </div>'+
        '        <div class="col-md-6 col-xl-3 mb-4">'+
        '          <div class="card shadow border-start-primary py-2">'+
        '            <div class="card-body">'+
        '              <div class="row align-items-center no-gutters">'+
        '                <div class="col me-2">'+
        '                  <div class="text-uppercase text-primary fw-bold text-xs mb-1"><span>MCHC</span></div>'+
        '                  <div class="text-dark fw-bold h5 mb-0"><span id="valueMCHC">' + hashedBloodCount["MCHC"] +' g/dl</span></div>'+
        '                </div>'+
        '                <div class="col-auto"><svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" fill="currentColor" viewBox="0 0 16 16" class="bi bi-arrow-up-square fa-2x text-gray-300">'+
        '                  <path fill-rule="evenodd" d="M15 2a1 1 0 0 0-1-1H2a1 1 0 0 0-1 1v12a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V2zM0 2a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2V2zm8.5 9.5a.5.5 0 0 1-1 0V5.707L5.354 7.854a.5.5 0 1 1-.708-.708l3-3a.5.5 0 0 1 .708 0l3 3a.5.5 0 0 1-.708.708L8.5 5.707V11.5z"></path>'+
        '                </svg></div>'+
        '              </div>'+
        '            </div>'+
        '          </div>'+
        '        </div>'+
        '      </div>';

    var dom = document.getElementById("BCHeader");

    dom.insertAdjacentHTML('beforeend', htmlText);

}

function getBloodCountAsHTML(hashedBloodCount, i, date) {
    var htmlText = "";

    htmlText = '<div class="accordion-item">'+
        '  <h4 id="headingOne" class="accordion-header"><button class="btn accordion-button" type="button" data-bs-toggle="collapse" aria-expanded="true" aria-controls="collapseOne" data-bs-target="#collapseOne">Blutbild #' + i +'</button></h4>'+
        '  <div id="collapseOne" class="accordion-collapse collapse show" aria-labelledby="headingOne" data-bs-parent="#accordionBloodCount">'+
        '    <div class="accordion-body"><strong>Dies sind die Werte für Blutbild #' + i +' vom ' + date +'</strong>'+
        '      <div class="row mt-3">'+
        '        <div class="col-md-6 col-xl-3 mb-4">'+
        '          <div class="card shadow border-start-primary py-2">'+
        '            <div class="card-body">'+
        '              <div class="row align-items-center no-gutters">'+
        '                <div class="col me-2">'+
        '                  <div class="text-uppercase text-primary fw-bold text-xs mb-1"><span>Erythrozyten</span></div>'+
        '                  <div class="text-dark fw-bold h5 mb-0"><span id="valueErythrozyten">' + hashedBloodCount["RBC"] +' Mio./µl</span></div>'+
        '                </div>'+
        '                <div class="col-auto"><svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" fill="currentColor" viewBox="0 0 16 16" class="bi bi-arrow-up-square fa-2x text-gray-300">'+
        '                  <path fill-rule="evenodd" d="M15 2a1 1 0 0 0-1-1H2a1 1 0 0 0-1 1v12a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V2zM0 2a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2V2zm8.5 9.5a.5.5 0 0 1-1 0V5.707L5.354 7.854a.5.5 0 1 1-.708-.708l3-3a.5.5 0 0 1 .708 0l3 3a.5.5 0 0 1-.708.708L8.5 5.707V11.5z"></path>'+
        '                </svg></div>'+
        '              </div>'+
        '            </div>'+
        '          </div>'+
        '        </div>'+
        '        <div class="col-md-6 col-xl-3 mb-4">'+
        '          <div class="card shadow border-start-primary py-2">'+
        '            <div class="card-body">'+
        '              <div class="row align-items-center no-gutters">'+
        '                <div class="col me-2">'+
        '                  <div class="text-uppercase text-primary fw-bold text-xs mb-1"><span>Leukozyten</span></div>'+
        '                  <div class="text-dark fw-bold h5 mb-0"><span id="valueLeukozyten">' + hashedBloodCount["WBC"] +' Tsd./µl</span></div>'+
        '                </div>'+
        '                <div class="col-auto"><svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" fill="currentColor" viewBox="0 0 16 16" class="bi bi-arrow-up-square fa-2x text-gray-300">'+
        '                  <path fill-rule="evenodd" d="M15 2a1 1 0 0 0-1-1H2a1 1 0 0 0-1 1v12a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V2zM0 2a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2V2zm8.5 9.5a.5.5 0 0 1-1 0V5.707L5.354 7.854a.5.5 0 1 1-.708-.708l3-3a.5.5 0 0 1 .708 0l3 3a.5.5 0 0 1-.708.708L8.5 5.707V11.5z"></path>'+
        '                </svg></div>'+
        '              </div>'+
        '            </div>'+
        '          </div>'+
        '        </div>'+
        '        <div class="col-md-6 col-xl-3 mb-4">'+
        '          <div class="card shadow border-start-primary py-2">'+
        '            <div class="card-body">'+
        '              <div class="row align-items-center no-gutters">'+
        '                <div class="col me-2">'+
        '                  <div class="text-uppercase text-primary fw-bold text-xs mb-1"><span>Thrombozyten</span></div>'+
        '                  <div class="text-dark fw-bold h5 mb-0"><span id="valueThrombozyten">' + hashedBloodCount["TC"] +' Tsd./µl</span></div>'+
        '                </div>'+
        '                <div class="col-auto"><svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" fill="currentColor" viewBox="0 0 16 16" class="bi bi-arrow-up-square fa-2x text-gray-300">'+
        '                  <path fill-rule="evenodd" d="M15 2a1 1 0 0 0-1-1H2a1 1 0 0 0-1 1v12a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V2zM0 2a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2V2zm8.5 9.5a.5.5 0 0 1-1 0V5.707L5.354 7.854a.5.5 0 1 1-.708-.708l3-3a.5.5 0 0 1 .708 0l3 3a.5.5 0 0 1-.708.708L8.5 5.707V11.5z"></path>'+
        '                </svg></div>'+
        '              </div>'+
        '            </div>'+
        '          </div>'+
        '        </div>'+
        '        <div class="col-md-6 col-xl-3 mb-4">'+
        '          <div class="card shadow border-start-primary py-2">'+
        '            <div class="card-body">'+
        '              <div class="row align-items-center no-gutters">'+
        '                <div class="col me-2">'+
        '                  <div class="text-uppercase text-primary fw-bold text-xs mb-1"><span>Hämatokrit</span></div>'+
        '                  <div class="text-dark fw-bold h5 mb-0"><span id="valueHämatokrit">' + hashedBloodCount["HCT"] +' %</span></div>'+
        '                </div>'+
        '                <div class="col-auto"><svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" fill="currentColor" viewBox="0 0 16 16" class="bi bi-arrow-up-square fa-2x text-gray-300">'+
        '                  <path fill-rule="evenodd" d="M15 2a1 1 0 0 0-1-1H2a1 1 0 0 0-1 1v12a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V2zM0 2a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2V2zm8.5 9.5a.5.5 0 0 1-1 0V5.707L5.354 7.854a.5.5 0 1 1-.708-.708l3-3a.5.5 0 0 1 .708 0l3 3a.5.5 0 0 1-.708.708L8.5 5.707V11.5z"></path>'+
        '                </svg></div>'+
        '              </div>'+
        '            </div>'+
        '          </div>'+
        '        </div>'+
        '      </div>'+
        '      <div class="row">'+
        '        <div class="col-md-6 col-xl-3 mb-4">'+
        '          <div class="card shadow border-start-primary py-2">'+
        '            <div class="card-body">'+
        '              <div class="row align-items-center no-gutters">'+
        '                <div class="col me-2">'+
        '                  <div class="text-uppercase text-primary fw-bold text-xs mb-1"><span>Hämoglobin</span></div>'+
        '                  <div class="text-dark fw-bold h5 mb-0"><span id="valueHämoglobin">' + hashedBloodCount["HB"] +' g/dl</span></div>'+
        '                </div>'+
        '                <div class="col-auto"><svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" fill="currentColor" viewBox="0 0 16 16" class="bi bi-arrow-up-square fa-2x text-gray-300">'+
        '                  <path fill-rule="evenodd" d="M15 2a1 1 0 0 0-1-1H2a1 1 0 0 0-1 1v12a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V2zM0 2a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2V2zm8.5 9.5a.5.5 0 0 1-1 0V5.707L5.354 7.854a.5.5 0 1 1-.708-.708l3-3a.5.5 0 0 1 .708 0l3 3a.5.5 0 0 1-.708.708L8.5 5.707V11.5z"></path>'+
        '                </svg></div>'+
        '              </div>'+
        '            </div>'+
        '          </div>'+
        '        </div>'+
        '        <div class="col-md-6 col-xl-3 mb-4">'+
        '          <div class="card shadow border-start-primary py-2">'+
        '            <div class="card-body">'+
        '              <div class="row align-items-center no-gutters">'+
        '                <div class="col me-2">'+
        '                  <div class="text-uppercase text-primary fw-bold text-xs mb-1"><span>MCV</span></div>'+
        '                  <div class="text-dark fw-bold h5 mb-0"><span id="valueMCV">' + hashedBloodCount["MCV"] +' Femtoliter</span></div>'+
        '                </div>'+
        '                <div class="col-auto"><svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" fill="currentColor" viewBox="0 0 16 16" class="bi bi-arrow-up-square fa-2x text-gray-300">'+
        '                  <path fill-rule="evenodd" d="M15 2a1 1 0 0 0-1-1H2a1 1 0 0 0-1 1v12a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V2zM0 2a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2V2zm8.5 9.5a.5.5 0 0 1-1 0V5.707L5.354 7.854a.5.5 0 1 1-.708-.708l3-3a.5.5 0 0 1 .708 0l3 3a.5.5 0 0 1-.708.708L8.5 5.707V11.5z"></path>'+
        '                </svg></div>'+
        '              </div>'+
        '            </div>'+
        '          </div>'+
        '        </div>'+
        '        <div class="col-md-6 col-xl-3 mb-4">'+
        '          <div class="card shadow border-start-primary py-2">'+
        '            <div class="card-body">'+
        '              <div class="row align-items-center no-gutters">'+
        '                <div class="col me-2">'+
        '                  <div class="text-uppercase text-primary fw-bold text-xs mb-1"><span>MCH</span></div>'+
        '                  <div class="text-dark fw-bold h5 mb-0"><span id="valueMCH">' + hashedBloodCount["MCH"] +' Pikogramm</span></div>'+
        '                </div>'+
        '                <div class="col-auto"><svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" fill="currentColor" viewBox="0 0 16 16" class="bi bi-arrow-up-square fa-2x text-gray-300">'+
        '                  <path fill-rule="evenodd" d="M15 2a1 1 0 0 0-1-1H2a1 1 0 0 0-1 1v12a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V2zM0 2a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2V2zm8.5 9.5a.5.5 0 0 1-1 0V5.707L5.354 7.854a.5.5 0 1 1-.708-.708l3-3a.5.5 0 0 1 .708 0l3 3a.5.5 0 0 1-.708.708L8.5 5.707V11.5z"></path>'+
        '                </svg></div>'+
        '              </div>'+
        '            </div>'+
        '          </div>'+
        '        </div>'+
        '        <div class="col-md-6 col-xl-3 mb-4">'+
        '          <div class="card shadow border-start-primary py-2">'+
        '            <div class="card-body">'+
        '              <div class="row align-items-center no-gutters">'+
        '                <div class="col me-2">'+
        '                  <div class="text-uppercase text-primary fw-bold text-xs mb-1"><span>MCHC</span></div>'+
        '                  <div class="text-dark fw-bold h5 mb-0"><span id="valueMCHC">' + hashedBloodCount["MCHC"] +' g/dl</span></div>'+
        '                </div>'+
        '                <div class="col-auto"><svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" fill="currentColor" viewBox="0 0 16 16" class="bi bi-arrow-up-square fa-2x text-gray-300">'+
        '                  <path fill-rule="evenodd" d="M15 2a1 1 0 0 0-1-1H2a1 1 0 0 0-1 1v12a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V2zM0 2a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2V2zm8.5 9.5a.5.5 0 0 1-1 0V5.707L5.354 7.854a.5.5 0 1 1-.708-.708l3-3a.5.5 0 0 1 .708 0l3 3a.5.5 0 0 1-.708.708L8.5 5.707V11.5z"></path>'+
        '                </svg></div>'+
        '              </div>'+
        '            </div>'+
        '          </div>'+
        '        </div>'+
        '      </div><button class="btn btn-outline-danger" type="button" id="deleteBC_' + date + '">Blutbild löschen</button>'+
        '    </div>'+
        '  </div>'+
        '</div>';



    return htmlText;
}

