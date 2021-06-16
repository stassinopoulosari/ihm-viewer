(() => {

    var db = firebase.firestore();
    const $loadingText = document.getElementById("loadingText"),
        $loadingIndicator = document.getElementById("loadingIndicator"),
        $loadingBar = document.getElementById("loadingBar")
    $categoriesContainer = document.getElementById("listCategories");

    //loading bar
    (() => {
        const loadingBarFrames = ['º..', '.º.', '..º'];
        var frameIndex = -1;
        setInterval(() => {
            frameIndex++;
            frameIndex %= loadingBarFrames.length;
            loadingBar.innerText = loadingBarFrames[frameIndex];
        }, 250);
    })();

    //load categories
    var loadCategories = () => {
        return new Promise((resolve, reject) => {
            var categoriesReference = db.collection("categories");
            categoriesReference.get().then((categoryDocumentsSnapshot) => {
                var categoryDocuments = categoryDocumentsSnapshot.docs,
                    categories = categoryDocuments.map((document) => {
                        return {
                            key: document.id,
                            data: document.data()
                        };
                    });
                resolve(categories);
            }).catch((categoriesError) => {
                reject(categoriesError);
            });
        });
    };

    var loadCircuits = () => {
        return new Promise((resolve, reject) => {
            var circuitsReference = db.collection("circuits");
            circuitsReference.get().then((circuitDocumentsSnapshot) => {
                var circuitDocuments = circuitDocumentsSnapshot.docs,
                    //Filter out deleted circuits
                    circuits = circuitDocuments.filter((circuitDocumentSnapshot) => circuitDocumentSnapshot.data().category != "deleted")
                    //Parse circuits and store the parsed information with stored information.
                    .map((circuitDocumentSnapshot) => {
                        var circuitDocument = circuitDocumentSnapshot.data(),
                            circuitID = circuitDocumentSnapshot.id,
                            circuitInstructions = circuitDocument.instructions;
                        //TODO Parse circuit
                        return {
                            storedDocument: circuitDocument,
                            circuitID: circuitID
                        };
                    })
                    //Sort by circuit key
                    .sort((a, b) => {
                        var refA = a.circuitID,
                            refB = b.circuitID;
                        if (refA > refB) return -1;
                        return 1;
                    });
                resolve(circuits);
            }).catch((circuitsError) => {
                reject(circuitsError);
            });
        });
    };

    var startingTime = new Date().getTime();
    var circuitCount = 0;

    loadCategories().then((categories) => {
        if(!categories) {
            return;
        }
        categories = categories.reverse();
        $loadingText.innerText = "Loading circuits";
        loadCircuits().then((circuits) => {
            $loadingText.innerText = "Loaded circuits and categories, building representation";
            for (var category in categories) {
                category = categories[category];
                var categoryKey = category.data.category,
                    categoryTitle = category.data.header,
                    categoryCircuits = circuits.filter((circuit) => circuit.storedDocument.category == categoryKey);
                var categoryElement = document.createElement("li");
                categoryElement.classList.add("list-group-item");
                categoryElement.classList.add("container");
                categoryElement.classList.add("category-item");
                var categoryHeader = document.createElement("h2");
                categoryHeader.innerText = categoryTitle;
                var categorySubElement = document.createElement("ul");
                categorySubElement.classList.add("list-group");
                categoryElement.appendChild(categoryHeader);
                categoryElement.appendChild(categorySubElement);

                for (var circuitIndex in categoryCircuits) {
                    circuitCount++;
                    const circuit = categoryCircuits[circuitIndex];
                    var circuitReference = circuit.circuitID;
                    var circuitTitle = circuit.storedDocument.title;
                    var circuitElement = document.createElement("li");
                    circuitElement.classList.add("list-group-item");
                    var linkElement = document.createElement("a");
                    linkElement.href = "./circuit?circuitID=" + circuitReference;
                    linkElement.innerText = circuitTitle;
                    circuitElement.appendChild(linkElement);
                    categorySubElement.appendChild(circuitElement);
                }

                $categoriesContainer.prepend(categoryElement);

            }

            var timeTaken = new Date().getTime() - startingTime;
            $loadingText.textContent = "Loaded " + circuitCount + " circuits in " + timeTaken + "ms.";
            $loadingBar.style.display = "none";
        }).catch(() => {
            $loadingText.textContent = "Error loading circuits :(";
            $loadingBar.style.display = "none";
        });
    }).catch(() => {
        $loadingText.textContent = "Error loading categories :(";
        $loadingBar.style.display = "none";
    });

})();
