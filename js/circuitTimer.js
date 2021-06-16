(() => {
    var db = firebase.firestore();

    var loadCircuitInstructions = (circuitID) => {
        return new Promise((resolve, reject) => {
            if(circuitID == null || circuitID == "") {
                reject("Malformed circuit name");
            }
            var circuitReference = db.collection("circuits").doc(circuitID);
            circuitReference.get().then((circuitDocument) => {
                if (!circuitDocument.exists) {
                    return reject("Circuit does not exist");
                }
                var data = circuitDocument.data();
                if (data == null) {
                    return reject("Null data");
                }
                var instructions = data.instructions;
                resolve(instructions);
            }).catch(reject);
        });
    };

    const $instructionsHeader = document.getElementById("instructionsHeader");

    if(location.search == "") {
        $instructionsHeader.textContent = "Sorry, no query string was detected and I'm going to kick you back to the circuits index. Toodles!";
        setTimeout(() => location.assign(".."), 1000);
        return;
    }

    var splitSearch = location.search.split("?");

    if (splitSearch.length < 2) {
        $instructionsHeader.textContent = "Sorry, your URL is malformed and I couldn't figure out what circuit you wanted me to load.";
        console.trace();
        return;
    }
    var queryString = splitSearch[1];
    var queryComponents = queryString.split("&");
    var matchingComponents = queryComponents.filter((component) => component.split("=").length == 2 && component.split("=")[0] == "circuitID");
    if(matchingComponents.length == 0) {
        $instructionsHeader.textContent = "Sorry, your URL is malformed and I couldn't figure out what circuit you wanted me to load.";
        console.trace();
        return;
    }
    var id = decodeURIComponent(matchingComponents[0].split("=")[1]);
    loadCircuitInstructions(id).then((instructions) => {
        var circuitData = consoleCircuits.parseCircuit(instructions);
        if (circuitData.name) {
            document.title = circuitData.name + " - IHM Viewer";
            document.getElementById("circuitName").textContent = circuitData.name;
        }

        startTimerApp(circuitData.instructions);
        console.log(circuitData);
    }).catch((x) => {
        $instructionsHeader.textContent = "Sorry, that circuit does not exist or there was a network error.";
        console.log(x);
        console.trace();
        return;
    });

    var startTimerApp = (instructions) => {
        //generate list of timed instructions
        var timedInstructions = instructions.filter(
            (instruction) => instruction.type == "timedExercise" || instruction.type == "interruption"
        );
        var formatTime = (time) => String(Math.floor(time / 60)).padStart(1, '0') + ":" + String(time % 60).padStart(2, 0);

        const $instructionsContainer = document.getElementById("instructionsContainer");

        //display instructions
        instructions
            .filter((instruction) => instruction.type == "timedExercise" || instruction.type == "repExercise")
            .map((instruction) => {
                var titleString = "";
                var timeString = "";
                switch (instruction.type) {
                    case "timedExercise":
                        titleString = instruction.data.exerciseName;
                        timeString = formatTime(instruction.data.length);
                        break;
                    case "repExercise":
                        titleString = instruction.data.exerciseName;
                        timeString = instruction.data.reps;
                        break;
                }
                var instructionOuterContainer = document.createElement("li");
                instructionOuterContainer.classList.add("list-group-item");
                if (instruction.type == "timedExercise") {
                    instructionOuterContainer.classList.add("timed-exercise-item");
                }
                var instructionInnerContainer = document.createElement("div");
                instructionInnerContainer.classList.add("row");
                instructionInnerContainer.classList.add("container-fluid");
                instructionOuterContainer.appendChild(instructionInnerContainer);
                var nameElement = document.createElement("div");
                nameElement.classList.add("col");
                nameElement.textContent = titleString;
                instructionInnerContainer.appendChild(nameElement);
                var auxElement = document.createElement("div");
                auxElement.classList.add("col");
                auxElement.classList.add("text-end");
                auxElement.textContent = timeString;
                instructionInnerContainer.appendChild(auxElement);
                instructionOuterContainer.setAttribute("data-represents", instruction.uuid);
                return instructionOuterContainer;
            }).forEach((instructionNode) => {
                instructionsContainer.appendChild(instructionNode);
            });

        $instructionsHeader.textContent = "Instructions";

        const $timeLeft = document.getElementById("timeLeft"),
            $playPauseButton = document.getElementById("playPauseButton"),
            $skipButton = document.getElementById("skipButton");

        var paused = true;
        var currentIndex = 0;
        var currentInstruction = timedInstructions[currentIndex];
        var timeLeft = currentInstruction.data.length + 1;

        var allTimedExerciseItems = document.getElementsByClassName("timed-exercise-item");
        [].slice.call(allTimedExerciseItems).forEach(($element) => {
            $element.onclick = () => {
                for (var index in timedInstructions) {
                    if (timedInstructions[index].uuid == $element.getAttribute("data-represents")) {
                        console.log(index);
                        currentIndex = index;
                        currentInstruction = timedInstructions[currentIndex];
                        timeLeft = timedInstructions[currentIndex].data.length + 1;
                        playBeep();
                        display();
                    }
                }
            }
        });
        for (var idx in allTimedExerciseItems) {
            var $element = allTimedExerciseItems[idx];
            if (!$element.classList) continue;
            console.log($element);

        }
        var display = () => {
            var currUUID = currentInstruction.uuid;
            var allTimedExerciseItems = document.getElementsByClassName("timed-exercise-item");
            for (var idx in allTimedExerciseItems) {
                var element = allTimedExerciseItems[idx];
                if (!element.classList) continue;
                if (element.classList.contains('list-group-item-danger') && element.getAttribute('data-represents') != currUUID) {
                    element.classList.remove('list-group-item-danger');
                } else if (element.getAttribute('data-represents') == currUUID) {
                    element.classList.add('list-group-item-danger');
                }
            }
            if (paused) {
                $playPauseButton.textContent = "Play";
            } else {
                $playPauseButton.textContent = "Pause";
            }
            $timeLeft.textContent = formatTime(Math.min(timeLeft, currentInstruction.data.length));
        };

        $playPauseButton.onclick = () => {
            if (!hasPreparedSounds) {
                prepareSounds();
                hasPreparedSounds = true;
            }
            paused = !paused;
            display();
        }

        $skipButton.onclick = () => {
            nextInstruction();
            display();
        }

        var finish = () => {
            $endSound.play();
            paused = true;
            currentIndex = 0;
            currentInstruction = timedInstructions[currentIndex];
            timeLeft = currentInstruction.data.length + 1;
            display();
        };

        var playEndSound = () => {
            if (!hasPreparedSounds) {
                prepareSounds();
                hasPreparedSounds = true;
            }
            $endSound.pause();
            $endSound.currentTime = 0;
            $endSound.play()
        };
        var playBeep = () => {
            if (!hasPreparedSounds) {
                prepareSounds();
                hasPreparedSounds = true;
            }
            $beepSound.pause();
            $beepSound.currentTime = 0;
            $beepSound.play()
        };

        var $endSound,
            $beepSound,
            hasPreparedSounds = false;

        var prepareSounds = () => {
            $endSound = document.createElement('audio');
            $endSound.style.display = "none";
            $endSound.src = "../finishBeep.mp3";
            $endSound.style.display = "none";
            $beepSound = document.createElement('audio');
            $beepSound.style.display = "none";
            $beepSound.src = "../beep.mp3";
            $beepSound.style.display = "none";
            document.body.appendChild($endSound);
            document.body.appendChild($beepSound);
        }

        var nextInstruction = (skipBeep) => {
            currentIndex++;
            if (currentIndex >= timedInstructions.length) {
                return finish();
            }
            currentInstruction = timedInstructions[currentIndex];
            console.log(currentInstruction);
            if (currentInstruction.type == "interruption") {
                console.log("triggered interruption thing");
                paused = true;
                playEndSound();
                return nextInstruction(true);
            }
            if (!skipBeep) {
                playBeep();
            }
            console.log(currentInstruction);
            timeLeft = currentInstruction.data.length + 1;
            return display();
        };

        setInterval(() => {
            if (paused) return;
            timeLeft--;
            display();
            if (timeLeft < 0) {
                nextInstruction();
                return;
            }
        }, 1000);
        display();
    };
})();
