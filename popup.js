document.addEventListener('DOMContentLoaded', function () {
    // Started when clicked
    performAction();
});

function performAction() {
    chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
        const activeTab = tabs[0];
        const siteUrl = activeTab.url;

        getCollectionADDRFromMintSite(siteUrl)
            .then(response => {
                console.log("All Mint info collected successfully");
                
                document.getElementById('collectionInfo').innerText = `Collection Address: ${response.endereco} \n\n`;
                const linkDagora = `https://dagora.xyz/collection/seiMainnet/${response.endereco}/onSale`;
                const linkName = "Dagora Marketplace Link - Click to Copy"
                const linkElement = document.createElement('a');
                linkElement.href = linkDagora;
                linkElement.innerText = linkName;
                collectionInfo2.appendChild(linkElement);
                linkElement.addEventListener('click', function(event) {
                    event.preventDefault();
                    navigator.clipboard.writeText(linkDagora)
                        .then(() => {
                            const popupMessage = document.createElement('div');
                            popupMessage.classList.add('popup-message');
                            popupMessage.innerText = 'Link copiado para a área de transferência!';
                            document.body.appendChild(popupMessage);
                
                            setTimeout(() => {
                                document.body.removeChild(popupMessage);
                            }, 2000);
                        })
                        .catch(err => {
                            console.error('Erro ao copiar o link: ', err);
                        });
                });

                console.log("Collections:", response.collections);
                
                const collectionStrings = response.collections.map(collection => {
                    console.log("Collection Name:", collection.name);
                    return `<strong>${collection.name}</strong>: ${collection.count} wallets`;
                });
                
                document.getElementById('collectionList').innerHTML = "<strong>Groups and allocation:</strong><br>" + collectionStrings.join("<br>");
                
                document.getElementById('extensionTitle').innerText = response.nome;
            })
            .catch(error => {
                console.error("Collection data collection error:", error);
                document.getElementById('collectionInfo').innerText = "Error on data collection: " + error;
            });
    });
}


function getCollectionADDRFromMintSite(url) {
    return new Promise((resolve, reject) => {
        fetch(url)
            .then(response => response.text())
            .then(html => {
                const scriptMatch = html.match(/<script.*?src=["'](.*?)["']/);

                if (scriptMatch && scriptMatch[1]) {
                    const scriptSrc = scriptMatch[1];
                    const fullScriptUrl = new URL(scriptSrc, url).toString();

                    return fetch(fullScriptUrl);
                } else {
                    throw new Error('src attribute not found.');
                }
            })
            .then(response => response.text())
            .then(scriptContent => {
                const regex = /const\s+r\s*=\s*JSON\.parse[^;]*;/;
                const match = scriptContent.match(regex);

                if (match) {
                    const jsonMatch = match[0].match(/\{.*\}/);
                    if (jsonMatch) {
                        console.log(jsonMatch);
                        let jsonString = jsonMatch[0].replace(/\\'/g, "'");
                        const parsedJson = JSON.parse(jsonString);
                        let atributoName, atributoAddr, collections;

                        if (parsedJson.N9 && parsedJson.OK && parsedJson.MJ) {
                            atributoName = parsedJson.N9;
                            atributoAddr = parsedJson.OK;
                            collections = Object.keys(parsedJson.MJ).map(key => ({
                                name: parsedJson.MJ[key].name,
                                count: parsedJson.MJ[key].allowlist ? parsedJson.MJ[key].allowlist.length : 0
                            }));
                        } else if (parsedJson.u2 && parsedJson.s_ && parsedJson.Xx) {
                            atributoName = parsedJson.u2;
                            atributoAddr = parsedJson.s_;
                            collections = Object.keys(parsedJson.Xx).map(key => ({
                                name: parsedJson.Xx[key].name,
                                count: parsedJson.Xx[key].allowlist ? parsedJson.Xx[key].allowlist.length : 0
                            }));
                        } else {
                            reject('keys N9, OK and MJ not found.');
                            return;
                        }

                        resolve({ nome: atributoName, endereco: atributoAddr, collections: collections });
                    } else {
                        reject('JSON not found.');
                    }
                } else {
                    reject('Line not found.');
                }
            })
            .catch(error => {
                reject(error);
            });
    });
}

