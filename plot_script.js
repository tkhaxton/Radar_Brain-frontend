
var spacing = 6;
var x_width = 11;
var y_width = 11;
var time_depth_past = 15;
var time_depth_future = 20;
var number_total_layers = 3;
var neurons_per_layer = 30;
var min_dBZ = -5;
var max_dBZ = 80;

google.setOnLoadCallback(drawChart);

function activation_function(z){
   return 1/(1 + Math.exp(-z));
}

function feed_forward(dBZ, bias, weight, number_neurons, predicted_dBZ) {

   // Create temporary data arrays
   
   var activation = new Array(number_total_layers);
   var weighted_input = new Array(number_total_layers);
   for(var i = 0; i < number_total_layers; i ++){
      activation[i] = new Array(number_neurons[i]);
      weighted_input[i] = new Array(number_neurons[i]);
   }
   var normalized_data;
         
   // Assign normalized inputs to activation of input layer
   
   for(var k = 0; k < time_depth_past; k ++){
      
      // dBZ data runs forward in time
      // but weight indexing runs backward in time
      
      time_slot = time_depth_past - 1 - k;
      
      for(var l = 0; l < y_width; l ++){
         for(var m = 0; m < x_width; m ++){
            
            // Convert to normalization (in range 0, 1) used for neural network
            
            normalized_data = (dBZ[time_slot][l][m] - min_dBZ)/(max_dBZ - min_dBZ);
            
            // Assign normalized inputs to activation of input layer
            
            activation[0][k*y_width*x_width + l*x_width + m] = normalized_data;
         }
      }
   }
   
   // Feed forward to hidden and output layers
   
   for(var k = 1; k < number_total_layers; k ++){
      for(var l = 0; l < number_neurons[k]; l ++){
         weighted_input[k][l] = bias[k][l];
         for(m = 0; m < number_neurons[k - 1]; m ++){
            weighted_input[k][l] += (activation[k-1][m]*weight[k][l][m]);
         }
         
         // Apply activation function
         
         activation[k][l] = activation_function(weighted_input[k][l]);
      }
   }
   for(var l = 0; l < number_neurons[number_total_layers - 1]; l ++){
      predicted_dBZ[l] = activation[number_total_layers - 1][l]*(max_dBZ - min_dBZ) + min_dBZ;
   }
}

function drawChart() {
      
   // Create multidimensional bias and weight arrays
   // (using same indexing conventions as back end code)
   
   var number_neurons = new Array(number_total_layers);
   number_neurons[0] = time_depth_past * x_width * y_width;
   for(var i = 1; i < number_total_layers - 1; i ++){
      number_neurons[i] = neurons_per_layer;
   }
   number_neurons[number_total_layers - 1] = time_depth_future;
   var bias = new Array(number_total_layers);
   var weight = new Array(number_total_layers);
   for(var i = 1; i < number_total_layers; i ++){
      bias[i] = new Array(number_neurons[i]);
      weight[i] = new Array(number_neurons[i]);
      for(var j = 0; j < number_neurons[i]; j ++){
         weight[i][j] = new Array(number_neurons[i - 1]);
      }
   }

   // Populate bias and weight arrays with data imported from "results.php"

   for(var i = 0; i < number_neurons[1]; i ++){
      bias[1][i] = parseFloat(bias_layer1_data[i]);
      for(var j = 0; j < number_neurons[0]; j ++){
         weight[1][i][j] = parseFloat(weight_layer1_data[i * number_neurons[0] + j]);
      }
   }
   for(var i = 0; i < number_neurons[2]; i ++){
      bias[2][i] = parseFloat(bias_layer2_data[i]);
      for(var j = 0; j < number_neurons[1]; j ++){
         weight[2][i][j] = parseFloat(weight_layer2_data[i * number_neurons[1] + j]);
      }
   }

   var predicted_dBZ = new Array(time_depth_future);
   var future_rain = new Array(time_depth_future);
   var past_rain = new Array(time_depth_past);
   
   // Feed forward through neural network
   
   feed_forward(dBZ, bias, weight, number_neurons, predicted_dBZ);
   
   // Convert decimal reflectivity to rainfall (mm/hr)
   
   for(var i = 0; i < time_depth_past; i ++){
      past_rain[i] = Math.pow(Math.pow(10., dBZ[i][(y_width-1)/2][(x_width-1)/2]/10.)/200., 5./8.);
   }
   for(var i = 0; i < time_depth_future; i ++){
      future_rain[i] = Math.pow(Math.pow(10., predicted_dBZ[i]/10.)/200., 5./8.);
   }
   
   // Create verbal message
   
   var rain_thresholds = [1.0, 2.5, 10, 50];
   var rain_categories = ["No", "Light", "Moderate", "Heavy", "Violent"];
   var rain_categories_lowercase = ["no", "light", "moderate", "heavy", "violent"];
   var rain_category_timeseries = [];
   var rain_category_timeseries_times = [0];
   var category;
   var current_rain = past_rain[past_rain.length - 1];
   if(current_rain < rain_thresholds[0]){
      rain_category_timeseries.push(0);
   }
   else{
      for(var i = 1; i < rain_thresholds.length; i ++){
         if((current_rain >= rain_thresholds[i - 1])&&(current_rain < rain_thresholds[i])){
            rain_category_timeseries.push(i);
         }
      }
      if(current_rain >= rain_thresholds[rain_thresholds.length - 1]){
         rain_category_timeseries = [rain_thresholds.length];
      }
   }
   for(var t = 0; t < future_rain.length; t ++){
      if(future_rain[t] < rain_thresholds[0]) category = 0;
      for(var i = 1; i < rain_thresholds.length - 1; i ++){
         if((future_rain[t] >= rain_thresholds[i - 1])&&(future_rain[i] < rain_thresholds[i])){
            category = i;
         }
      }
      if(future_rain[t] >= rain_thresholds[rain_thresholds.length - 1]) category = rain_thresholds.length;
      if(category != rain_category_timeseries[rain_category_timeseries.length - 1]){
         rain_category_timeseries.push(category);
         rain_category_timeseries_times.push((t + 1) * spacing);
      }
   }
   var forecast_message;
   if(rain_category_timeseries.length == 1){
      forecast_message = rain_categories[rain_category_timeseries[0]] + " rain for the next two hours.";
   }
   else{
      if(rain_category_timeseries[0] == 0){
         forecast_message = rain_categories[rain_category_timeseries[1]] + " rain starting in " + rain_category_timeseries_times[1].toString() + " minutes.";
      }
      else{
         forecast_message = rain_categories[rain_category_timeseries[0]];
         if(rain_category_timeseries[1] == 0){
            forecast_message += (" rain stopping in " + rain_category_timeseries_times[1].toString() + " minutes.");
         }
         else{
            forecast_message += (" rain becoming " + rain_categories_lowercase[rain_category_timeseries[1]] + " in " + rain_category_timeseries_times[1].toString() + " minutes.");
         }
      }
   }
   
   // Print message on web page
   
   document.getElementById('topmessage').innerHTML += forecast_message;
   
   // Convert data for use by Google Chart
      
   var data = new google.visualization.DataTable();
   data.addColumn('timeofday', 'Time');
   data.addColumn('number', 'Rainfall (mm/hr)');
   data.addColumn('number', 'Rainfall (mm/hr)');
   
   var maxvalue = 0;
   var minvalue;
   var leftticks = new Array();
   var rightticks = new Array();

   // Add past rain data to Google Chart data table, moving forward in time
   
   var currentTime = new Date();
   var movingTime = currentTime;
   movingTime.setMinutes(movingTime.getMinutes() - spacing * (past_rain.length - 1));
   
   // First, enter only one data series to reveal blue curve
   
   for(i = 0; i < past_rain.length - 1; i++){
      data.addRows([[[movingTime.getHours(), movingTime.getMinutes(), movingTime.getSeconds(), movingTime.getMilliseconds()], past_rain[i], 0/0]]);
      movingTime.setMinutes(movingTime.getMinutes() + spacing);
      if (past_rain[i] > maxvalue) maxvalue = past_rain[i];
   }
   
   // For current time and later, enter two data series to cover with red curve
   
   data.addRows([[[movingTime.getHours(), movingTime.getMinutes(), movingTime.getSeconds(), movingTime.getMilliseconds()], past_rain[past_rain.length - 1], past_rain[past_rain.length - 1]]]);
   movingTime.setMinutes(movingTime.getMinutes() + spacing);
   if (past_rain[past_rain.length - 1] > maxvalue) maxvalue = past_rain[past_rain.length - 1];
   
   // Add future rain data to Google Chart data table, moving forward in time
   
   for(i = 0; i < future_rain.length; i++){
      data.addRows([[[movingTime.getHours(), movingTime.getMinutes(), movingTime.getSeconds(), movingTime.getMilliseconds()], future_rain[i], future_rain[i]]]);
      movingTime.setMinutes(movingTime.getMinutes() + spacing);
      if (future_rain[i] > maxvalue) maxvalue = future_rain[i];
   }
   
   // Create tick marks according to range of rainfall plot
   
   if(maxvalue > 40){
      maxvalue = (parseInt(maxvalue) / 10 + 1) * 10;
      minvalue = -10;
      leftticks[0] = {v:-10, f:''};
      for(i = 1; i <= maxvalue / 10 + 1; i ++){
         leftticks[i] = (i - 1) * 10;
      }
      rightticks = [{v:0, f:'no rain'}, {v:2.5, f:'moderate rain'}, {v:10, f:'heavy rain'}, {v:50, f:'violent rain'}, {v:maxvalue, f:''}];
   }
   else if(maxvalue > 10){
      maxvalue = (parseInt(maxvalue) / 5 + 1) * 5;
      minvalue = -5;
      leftticks[0] = {v:-5, f:''};
      for(i = 1; i <= maxvalue / 5 + 1; i ++){
         leftticks[i] = (i - 1) * 5;
      }
      rightticks = [{v:-5, f:''}, {v:0, f:'no rain'}, {v:2.5, f:'moderate rain'}, {v:10, f:'heavy rain'}, {v:maxvalue, f:''}];
   }
   else{
      maxvalue = 10;
      minvalue = -2;
      leftticks = [{v:-2, f:''}, 0, 2, 4, 6, 8, 10];
      rightticks = [{v:-2, f:''}, {v:0, f:'no rain'}, {v:2.5, f:'moderate rain'}, {v:10, f:'heavy rain'}];
   }

   var options = {
      //title: '',
   colors:['blue', 'red'],
   chartArea:{left:50,top:10,bottom:10,height:"85%",width:"75%",backgroundColor:{strokeWidth:10}},
   lineWidth: 5,
   series: {
      0: {
         // assign the first data series (y-left) to the left axis
      targetAxisIndex: 0
      },
      1: {
         // assign the second data series (y-right) to the right axis
      targetAxisIndex: 1
      }
   },
   hAxis: {title: "Time", format: "h:mm"},
   vAxes: {0: {title: "Rainfall (mm/hr)", maxValue: maxvalue, minValue: minvalue, ticks: leftticks}, 1: {maxValue: maxvalue, minValue: minvalue, ticks: rightticks}},
   curveType: 'none',
   legend: { position: 'none' }
   };
   
   var chart = new google.visualization.LineChart(document.getElementById('curve_chart'));
   
   chart.draw(data, options);
}
