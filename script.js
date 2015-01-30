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
	source.initImage('img.jpg',function(){
		var array = source.getArray();

		// gaussian blur
		//var matrix = [[ 1, 2, 1],
									//[ 2, 4, 2],
									//[ 1, 2, 1]];
		//var ratio = 1.0/16.0;

		// Sobel
		//var matrix = [ [1,2,1 ], [ 0, 0, 0 ], [ -1,-2,-1 ] ];
		//var ratio = 1.0/4.0;

		//var matrix = [ [0,1,0 ], [ 1, -4, 1 ], [ 0,1,0 ] ];
		var matrix = [ [1,0,-1 ], [ 2, 0, -2 ], [ 1,0,-1 ] ];
		var ratio = 1;
		array = convolution(array, matrix, ratio);

		var destination = new Can('canvas-destination');
		destination.buildPixelsFromGrey(array)
		destination.display();
	});

	function reverseImage(array){
		for(var line = 0, lines = array.length; line < lines; line++){
			for(var column = 0, columns = array[line].length; column < columns; column++){
				array[line][column].red = 255 -array[line][column].red ;
				array[line][column].green= 255 -array[line][column].green;
				array[line][column].blue= 255 -array[line][column].blue;
				array[line][column].alpha= 255;
			}
		}
	}

	function convolution(array, matrix, ratio){
		// default ratio is 1
		ratio = ratio|1;
		var result = array.slice();
		var matrixSize = matrix.length;
		var padding = Math.floor(matrixSize/2);

		for(var line = padding, lines = array.length - padding; line < lines; line++){
			for(var column = padding, columns = array[line].length - padding; column < columns; column++){
				var val = 0;

				for(var matrixLine = -padding; matrixLine <= padding; matrixLine ++){
					for(var matrixColumn = -padding; matrixColumn <= padding; matrixColumn ++){
						val += matrix[matrixLine+padding][matrixColumn+padding] * array[line + matrixLine][column + matrixColumn].grey;
					}
				}

				val = Math.abs(ratio*val);

				if(val > 255) result[line][column].grey = 255;
				else if(val  < 0) result[line][column].grey = 0;
				else result[line][column].grey = val;
			}
		}
		return result;
	}
	function rouge(array){
		for(var line = 1, lines = array.length - 1; line < lines; line++){
			for(var column = 1, columns = array[line].length - 1; column < columns; column++){

				if(array[line][column].red > 127) array[line][column].red = 255;
				else if(array[line][column].red  < 127) array[line][column].red = 0;

			}
		}
	}
});
