$(function(){
	var Can = function(idSource){
		var canvas = document.getElementById(idSource);
		var context = canvas.getContext('2d');
		var image = new Image();
		var imageDataDump;

		function initImage(imgSource, callback){
			image.src = imgSource;

			// loading and drawing image
			$(image).load(function(){
				context.drawImage(image, 0, 0);
				callback();
			});
		}

		// getting pixel from 1,1 to w,h
		function getPixel(x,y){
			var imageData = context.getImageData(0, 0, canvas.width, canvas.height);
			var pixels = imageData.data;
			var pixelRedIndex = ((y - 1) * (imageData.width * 4)) + ((x - 1) * 4);

			var grey = ( pixels[pixelRedIndex] + pixels[pixelRedIndex+1] + pixels[pixelRedIndex+2]  )/3

			return { red    : pixels[pixelRedIndex], green : pixels[pixelRedIndex+1],
				blue  : pixels[pixelRedIndex+2], grey : grey	};
		}

		// convert pixels from [] to [][]{}
		function getArray(){
			var imageData = context.getImageData(0, 0, canvas.width, canvas.height);
			var pixels = imageData.data;
			var imageWidth = imageData.width;

			var array = [];
			for(var line = 0; line < imageData.height; line++){
				array[line] = [];
				for(var column = 0; column < imageData.width; column++){
					var pixelRedIndex = (line * imageWidth + column) *  4;
					var grey = ( pixels[pixelRedIndex] + pixels[pixelRedIndex+1] + pixels[pixelRedIndex+2]  )/3
					array[line][column] = {
						red : pixels[pixelRedIndex],
						green : pixels[pixelRedIndex+1],
						blue  : pixels[pixelRedIndex+2],
						grey : grey
					};
				}
			}
			return array;
		}

		// convert pixels from [][]{} to []
		function buildPixels(array){
			var imageData = context.getImageData(0, 0, canvas.width, canvas.height);
			var imageWidth = imageData.width;
			var pixels = imageData.data;
			for(var line = 0, lines = array.length; line < lines; line++){
				for(var column = 0, columns = array[line].length; column < columns; column++){
					var pixelRedIndex = (line * imageWidth + column) *  4;
					pixels[pixelRedIndex] = array[line][column].red;
					pixels[pixelRedIndex+1] = array[line][column].green;
					pixels[pixelRedIndex+2] = array[line][column].blue;
					pixels[pixelRedIndex+3] = 255;
				}
			}
			imageDataDump = imageData;
		}

		function buildPixelsFromGrey(array){
			var imageData = context.getImageData(0, 0, canvas.width, canvas.height);
			var imageWidth = imageData.width;
			var pixels = imageData.data;
			for(var line = 0, lines = array.length; line < lines; line++){
				for(var column = 0, columns = array[line].length; column < columns; column++){
					var pixelRedIndex = (line * imageWidth + column) *  4;
					pixels[pixelRedIndex] = array[line][column].grey;
					pixels[pixelRedIndex+1] = array[line][column].grey;
					pixels[pixelRedIndex+2] = array[line][column].grey;
					pixels[pixelRedIndex+3] = 255;
				}
			}
			imageDataDump = imageData;
			return this;
		}

		function display(pixels){
			context.putImageData(imageDataDump, 0, 0);
		}

		return {
			getPixel : getPixel,
			initImage : initImage,
			getArray : getArray,
			buildPixels : buildPixels,
			buildPixelsFromGrey : buildPixelsFromGrey,
			display : display
		};
	}

	var source = new Can('canvas-source');
	source.initImage('cube.jpg',function(){
		var array = source.getArray();
		(new Can('canvas-source-grey')).buildPixelsFromGrey(array).display();

		// gaussian blur
		var gaussianMatrix = [[ 1, 2, 1], [ 2, 4, 2], [ 1, 2, 1]];
		var gaussianRatio = 1.0/16.0;
		var gaussianArray = convolution(array, gaussianMatrix, gaussianRatio);

		// Sobel
		var sobelMatrix = [[+2, +3, +1], [0, 0, 0], [-1, -3, -2]];
		var sobelRatio = 1.0/6.0;
		var verticalEdges = convolution(gaussianArray, sobelMatrix, sobelRatio);

		// Sobel Hor
		var sobelHorMatrix = [[+1, 0, -2], [+3, 0, -3], [+2, 0, -1]];
		var sobelHorRatio = 1.0/6.0;
		var horizontalEdges = convolution(gaussianArray, sobelHorMatrix, sobelHorRatio);

		var allEdges = add(verticalEdges, horizontalEdges);

		(new Can('canvas-edges')).buildPixelsFromGrey(allEdges).display();

		var houghImage = hough(allEdges);

		var result = drawLines(houghImage,array);

		(new Can('canvas-destination')).buildPixelsFromGrey(result).display();
	});


	function convolution(array, matrix, ratio){
		// default ratio is 1
		var m = matrix.reduce(function(a, b){return a.concat(b);});
		ratio = ratio||m.reduce(function(a,b){return a + b;})||1;
		// copy of the array
		var result = JSON.parse(JSON.stringify(array));
		var matrixSize = matrix.length;
		var padding = Math.floor(matrixSize/2);


		for(var line = padding, lines = array.length - padding; line < lines; line++){
			for(var column = padding, columns = array[line].length - padding; column < columns; column++){
				var val = 0;

				for(var matrixLine = -padding; matrixLine <= padding; matrixLine ++){
					for(var matrixColumn = -padding; matrixColumn <= padding; matrixColumn ++){
						var valeur = matrix[matrixLine+padding][matrixColumn+padding] * array[line + matrixLine][column + matrixColumn].grey;
						val += valeur;
					}
				}

				val = Math.round(Math.abs(ratio*val));

				if(val > 255) result[line][column].grey = 255;
				else if(val  < 0) result[line][column].grey = 0;
				else result[line][column].grey = val;
			}
		}
		return result;
	}

	function hough(array){
		var threshold = 70;
		var maxHough = 0;

		var houghAccumulateur = zeros([360,Math.hypot(300,400)]);
		var result = zeros([360,Math.hypot(300,400)]);

		for(var line = 1, lines = array.length -1 ; line < lines; line++){
			for(var column = 1, columns = array[line].length -1 ; column < columns; column++){
				if(array[line][column].grey > threshold){
					var rho = 0;
					for(var angle = 0; angle < 360; angle ++){
						//debugger;
						rho = Math.round(column * 1.0 * Math.cos(degToRad(angle)) + line * 1.0 * Math.sin(degToRad(angle)));
						houghAccumulateur[angle][rho] += 1;
						if(houghAccumulateur[angle][rho] > maxHough && rho > 1){
							maxHough = houghAccumulateur[angle][rho];
						}
					}
				}
			}
		}

		for(var line = 0, lines = result.length ; line < lines; line++){
			for(var column = 0, columns = result[line].length ; column < columns; column++){
				result[line][column]= Math.round(houghAccumulateur[line][column] * (255.0 / maxHough)) ;
			}
		}

		return result;
	}

	function drawLines(houghArray, imageArray){
		var result = JSON.parse(JSON.stringify(imageArray));
		var thresholdhough = 180;

		for(var line = 0, lines = result.length ; line < lines; line++){
			for(var column = 0, columns = result[line].length ; column < columns; column++){
				result[line][column].grey -= 20;
				if(result[line][column].grey < 0) result[line][column].grey = 0;
			}
		}

		for(var line = 1, lines = houghArray.length - 1; line < lines; line++){
			for(var column = 1, columns = houghArray[line].length - 1 ; column < columns; column++){
				if(houghArray[line][column] > thresholdhough){
					for (var i = 0; i < imageArray.length; i++) {
					var j = Math.round((column - (i * Math.cos ( degToRad ( line )  ))) / Math.sin ( degToRad ( line  )  ));
						if ( j > 0 && j < imageArray.length  ) {
							result[j][i].grey = 255;
						}
					}
				}
			}
		}
		return result;
	}

	function add(array1, array2){
		var result = JSON.parse(JSON.stringify(array1));
		for(var line = 0, lines = result.length ; line < lines; line++){
			for(var column = 0, columns = result[line].length ; column < columns; column++){
				result[line][column].grey += array2[line][column].grey;
				if(result[line][column].grey > 255) result[line][column].grey = 255;
			}
		}
		return result;
	}

	// utilities
	function degToRad(deg){ return deg * 3.14159265359 / 180.0; }
	function zeros(dimensions) {
		    var array = [];
				for (var i = 0; i < dimensions[0]; ++i) {
					array.push(dimensions.length == 1 ? 0 : zeros(dimensions.slice(1)));
				}
				return array;
	}
});
