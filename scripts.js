$(document).ready(function(){
   
   // API keys
   
   var geoapikey="Fmjtd|luu82q07n0%2Can%3Do5-94yn1a";
   var weatherapikey="9dca623021acb71b";
   
   // Resolution of training data set in degrees
   
   var datares = 0.01;
   
   // One-sided range of radar data used to predict future radar
   // Data size is (2*latrange+1)*(2*lonrange+1)
   
   var latrange = 5;
   var lonrange = 5;
   
   // Derived variables
   
   var height = 2 * latrange + 1;
   var width = 2 * lonrange + 1;
   var minlat, maxlat, minlon, maxlon;
   
   function reDirect(radarurl) {
      var page='results.php?radarurl='+radarurl;
      document.location.href=page;
   }
       
   var get_location_on_click = function(event){
      if (navigator.geolocation) {
         
         // Pass additional argument (event) to callback function
         // Following http://theelitist.net/passing-additional-arguments-to-a-callback-function-in-javascript
         
         navigator.geolocation.getCurrentPosition(function(position){showPosition(position, event)});
         
         // Instead of this:
         // navigator.geolocation.getCurrentPosition(showPosition);
         
      } else {
         $('#message').html('Geolocation is not supported by this browser.');
      }
   }
   
   function showPosition(position, event){
      latitude = position.coords.latitude;
      longitude = position.coords.longitude;
      load_new_page_using_coordinates(event, latitude, longitude);
   }
   
   function showError(error) {
      switch(error.code) {
         case error.PERMISSION_DENIED:
            $('#message').html('User denied the request for Geolocation.');
            break;
         case error.POSITION_UNAVAILABLE:
            $('#message').html('Location information is unavailable.');
            break;
         case error.TIMEOUT:
            $('#message').html('The request to get user location timed out.');
            break;
         case error.UNKNOWN_ERROR:
            $('#message').html('An unknown error occurred.');
            break;
      }
   }
   
   var onclick = function(event){
      var termvalue = $('#addressterm').val();
      var longitude;
      var latitude;
      var radarurl;
      var geocodeQualityCode;
      var confidencelevels;
      if(termvalue == ''){
         
         // Check to make sure there is something in the field
         
         $('#message').html('Please enter something.');
      } else {
         
         // Convert address to latitude and longitude using Open MapQuest API
         
         $.getJSON(event.data.geourlbase + termvalue, function(json) {
            latitude = json.results[0].locations[0].latLng.lat;
            longitude = json.results[0].locations[0].latLng.lng;
            geocodeQualityCode = json.results[0].locations[0].geocodeQualityCode;
            confidencelevels = geocodeQualityCode.substr(geocodeQualityCode.length - 3);
            if(confidencelevels == 'XXX'){
               $('#message').html('Location not understood. Please try again.');
            }
            else{
               load_new_page_using_coordinates(event, latitude, longitude);
            }
         });
      }
   }
   
   function load_new_page_using_coordinates(event, latitude, longitude){
      
      // Round to the resolution of the training data set
      
      rounded_latitude = result=Math.round(latitude/datares)*datares;
      rounded_longitude = result=Math.round(longitude/datares)*datares;
      
      minlat = rounded_latitude - latrange * datares;
      maxlat = rounded_latitude + latrange * datares;
      minlon = rounded_longitude - lonrange * datares;
      maxlon = rounded_longitude + lonrange * datares;
      
      // Get radar image from Weather Underground API
      
      radarurl=event.data.weatherurlbase + '&minlat=' + minlat + '&maxlat=' + maxlat + '&minlon=' + minlon + '&maxlon=' + maxlon + '&width=' + width + '&height=' + height;
      console.log(radarurl);
               
      // Encode radarul so php script can handle ampersands
      
      str = encodeURIComponent(radarurl);
      
      // Redirect to new page created by php using radar url created here
      
      reDirect(str);
   }

   var geourl = "http://open.mapquestapi.com/geocoding/v1/address?key=" + geoapikey + "&callback=?&location=";
   var weatherurl = "http://api.wunderground.com/api/" + weatherapikey + "/animatedradar/image.gif?&newmaps=0&callback=?";
   
   $('#geolocateclick').click({weatherurlbase: weatherurl}, get_location_on_click);
   $('#addressclick').click({geourlbase: geourl, weatherurlbase: weatherurl}, onclick);
   $('#addressterm').keyup(function(event){
      if(event.keyCode == 13){
         $('#addressclick').trigger('click');
      }
   });
});
