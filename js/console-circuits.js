(function() {
  //BLOCK — Global Variables

  var commandSeparator = ";",
    paramSeparator = "|",
    commandTokens = {
      "comment": "#",
      "displayName": "disp",
      "timedExercise": "tex",
      "repExercise": "rex",
      "interruption": "int"
    },
    invert = function(object) {
      var invertedObject = {};
      for (var key in object) {
        invertedObject[object[key]] = key;
      }
      return invertedObject;
    },
    tokenCommands = invert(commandTokens);

  var exports = {
    commandTokens: commandTokens,
    tokenCommands: tokenCommands
  };

  (function() {
    //BLOCK — Parse Circuit
    var parseCircuit = function(circuitText) {
        var circuitData = {
          name: "",
          instructions: []
        };

        circuitText = circuitText.trim();

        var splitCircuitText = circuitText.split(commandSeparator),
          instructionsData = splitCircuitText.map((commandString) => {
            try {

              var arguments = commandString.split(paramSeparator).map((param) => {
                  return param.trim();
                }),
                command = arguments.shift(1).toLowerCase();


              if (command == "") return;

              var instructionData = parseInstruction(command, arguments);

              if (instructionData == null) {
                return;
              } else if (instructionData.type == "displayName") {
                circuitData.name = instructionData.data;
              }

              return instructionData;

            } catch (exception) {

              console.error(exception);
              return null;

            }
          }).filter((instruction) => {
            return instruction ? true : false;
          });

        circuitData.instructions = instructionsData;

        return circuitData;

      },
      parseInstruction = function(command, arguments) {
        var data;
        if (tokenCommands[command]) {
          switch (tokenCommands[command]) {
            case "comment":
              data = parseComment(arguments);
              break;
            case "displayName":
              data = parseDisplayName(arguments);
              break;
            case "timedExercise":
              data = parseTimedExercise(arguments);
              break;
            case "repExercise":
              data = parseRepExercise(arguments);
              break;
            case "interruption":
              data = parseInterruption(arguments);
              break;
            default:
              throw "CircuitParseError: unrecognised command " + command;
          }

          data.uuid = generateUUID();
          return data;
        } else {
          throw "CircuitParseError: unrecognised command " + command;
        }
      },
      parseComment = function(arguments) {
        if (arguments.length != 1) {
          throw "CircuitParseError: # expected 1 argument";
        }
        return {
          type: "comment",
          data: arguments[0]
        };
      },
      parseDisplayName = function(arguments) {
        if (arguments.length != 1) {
          throw "CircuitParseError: disp expected 1 argument";
        }
        return {
          type: "displayName",
          data: arguments[0]
        };
      },
      parseTimedExercise = function(arguments) {
        if (arguments.length != 3) {
          throw "CircuitParseError: tex expected 3 arguments";
        }
        var data = {};
        data.exerciseName = arguments[0];
        var startTime = parseInt(arguments[1]),
          endTime = parseInt(arguments[2]),
          len = endTime - startTime;
        data.length = len;
        return {
          type: "timedExercise",
          data: data
        }
      },
      parseRepExercise = function(arguments) {
        if (arguments.length != 2) {
          throw "CircuitParseError: rex expected 2 arguments";
        }
        var data = {};
        data.exerciseName = arguments[0];
        data.reps = arguments[1];
        return {
          type: "repExercise",
          data: data
        };
      },
      parseInterruption = function(arguments) {
        if (arguments.length != 0) {
          throw "CircuitParseError: int expected 0 arguments";
        }
        return {
          type: "interruption"
        };
      },
      generateUUID = function() {
          //Stolen from stack overflow, I think lol
        return Math.random().toString(36).substring(2) + Date.now().toString(36);
      };

    exports.parseCircuit = parseCircuit;
    exports.generateUUID = generateUUID;
  })();

  window.consoleCircuits = exports;
})();
