

/**
 * Function to mask clouds using the Sentinel-2 QA band
 * @param {ee.Image} image Sentinel-2 image
 * @return {ee.Image} cloud masked Sentinel-2 image
 */
 
 function maskS2clouds(image) {
  var qa = image.select('QA60');
  // Bits 10 and 11 are clouds and cirrus, respectively.
  var cloudBitMask = 1 << 10;
  var cirrusBitMask = 1 << 11;
  // Both flags should be set to zero, indicating clear conditions.
  var mask = qa.bitwiseAnd(cloudBitMask).eq(0)
      .and(qa.bitwiseAnd(cirrusBitMask).eq(0));
  return image.updateMask(mask).divide(10000);
}

// Map the function over one month of data and take the median.
// Load Sentinel-2 TOA reflectance data.
var dataset = ee.ImageCollection('COPERNICUS/S2')
                  .filterDate('2021-01-01', '2022-01-31')
                  // Pre-filter to get less cloudy granules.
                  .filter(ee.Filter.lt('CLOUDY_PIXEL_PERCENTAGE', 20))
                  .map(maskS2clouds);
                  
var sent_2 = dataset.median().clip(ROI);


//var bands =  ['B1','B2','B3','B4','B5','B6','B7','B8','B8A','B9','B10','B11','B12']; //clasificacion aceptable
//var bands =  ['B12','B11','B4']; //buena clasificacion
var bands =  ['B11','B8','B2'];

var rgbVis = {
  min: 0.0,
  max: 0.3,
  bands: bands,
};

Map.setCenter(-116.831, 32.388,10);
Map.addLayer(sent_2, rgbVis, 'Sentinel2');

Map.addLayer(ROI);
//Map.addLayer(geometry);

/*Export.image.toDrive({
  image : sent_2,
  description: 'imagen_sentinel2',
  scale : 5,
  region : table
})*/




var training_points = Industrial.merge(AreaVerde).merge(Urbano).merge(desocupado).merge(Agua);

var training_data = sent_2.sampleRegions({ 
  collection: training_points, 
  properties: ['LC'], 
  scale: 50
} );

var classifier = ee.Classifier.smileCart();

var classifier = classifier.train({  
  features: training_data,
  classProperty: 'LC',
  inputProperties: bands
});

var classified_image = sent_2.classify(classifier);

Map.addLayer(classified_image , {min: 0 , max:4 , palette:['red','green', 'black', 'yellow', 'Blue']} , 'classified image');

//Exportar la imagena drive

Export.image.toDrive({
  image : classified_image,
  description: 'class image',
  scale : 5,
  region: ROI
});



