<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<title>Radar Brain: rain nowcasting with machine learning</title>
<meta name="author" content="Tom Haxton">
<meta name="description" content="Artificial neural network weather nowcaster (extrapolate near-term weather forecast)">

<!--Load the AJAX API for Google Charts-->
<script type="text/javascript" src="https://www.google.com/jsapi?autoload={'modules':[{'name':'visualization','version':'1','packages':['corechart']}]}"></script>
<script src="plot_script.js" type="text/javascript"></script>

<link rel="stylesheet" href="style.css">
</head>
<body>
<?

$radarurl = $_GET['radarurl'];
$fullurl = $radarurl . "&num=15";
$animation = 'radar.gif';

// Download animated gif radar image from Weather Underground API

file_put_contents($animation, file_get_contents($fullurl));

// Convert gif image to data
// First, split gif using Laszlo Zsidi's gifsplit

include_once ("gifsplit-2009-07-03/GIFDecoder.class.php" );
$gifDecoder = new GIFDecoder ( fread ( fopen ( $animation, "rb" ), filesize ( $animation ) ) );
$frame = 0;
foreach ( $gifDecoder -> GIFGetFrames ( ) as $frameimage ) {
   
   // I would like to just do this:
   // $image = $frameimage
   // But it doesn't work: Imagecolorat expects resource, string given 
   
   // Instead, create temporarily files for each frame, then read the file to create image resource
   
   $file = "tmpframe.gif";
   fwrite ( fopen ( $file , "wb" ), $frameimage );
   $image = ImageCreateFromGif($file);
   
   $size = GetImageSize($animation);
   $width = $size[0];
   $height = $size[1];
   for ($i = 0; $i < $height; $i++) {
      for ($j = 0; $j < $width; $j++) {
         $palette_index = ImageColorAt($image, $j, $i);
         
         // Map palette index to dBZ using color table found in gif and colors
         // in Weather Underground's radar legend online
         
         if($palette_index==0){
            $dBZ[$frame][$i][$j] = 0;    //  Black indicates below threshold
         }
         else if(($palette_index>1) and ($palette_index<17)){
            $dBZ[$frame][$i][$j] = 5 * ($palette_index - 1);
         }
         else if(($palette_index>16) and ($palette_index<115)){
            
            // Sometimes radar data uses finer scale, defined later in the color key
            
            $shifted = ($palette_index - 17);
            $interval = $shifted / 7;
            $fine_index = $interval % 7 + 1;
            $dBZ[$frame][$i][$j] = ($interval + 1) * 5 + 5. * $fine_index / 8;
         }
         else{
            echo "Palette index ", $palette_index, " not expected in frame ", $frame, "<br>";
         }
         
      }
   }
   $frame++;
}

// Delete temporary files

unlink($file);
unlink($animation);

// Read neural network parameters from file

$file = file_get_contents('data/bias_layer1_individual.txt');
$bias_layer1_data = explode(" ", $file);
$file = file_get_contents('data/bias_layer2_individual.txt');
$bias_layer2_data = explode(" ", $file);
$file = file_get_contents('data/weight_layer1_individual.txt');
$weight_layer1_data = explode(" ", $file);
$file = file_get_contents('data/weight_layer2_individual.txt');
$weight_layer2_data = explode(" ", $file);
?>

<script type="text/javascript">

// Pass data to "plot_script.js" javascript file
// using Json as described at
// http://stackoverflow.com/questions/4885737/pass-a-php-array-to-a-javascript-function

var dBZ = <?php echo json_encode($dBZ); ?>;
var bias_layer1_data = <?php echo json_encode($bias_layer1_data); ?>;
var bias_layer2_data = <?php echo json_encode($bias_layer2_data); ?>;
var weight_layer1_data = <?php echo json_encode($weight_layer1_data); ?>;
var weight_layer2_data = <?php echo json_encode($weight_layer2_data); ?>;
</script>

<div id="wrap">
<div id="main">
<div id="topmessage">
</div>
<div id="bigcontainer">
<div id="curve_chart" style="width: 600px; height: 400px"></div>
</div>
</div>
</div>

<div id="footer">
<div id="footerbuttons">
<div id="footerleft">
<button onclick="location.href='index.html'">Home</button>
</div>
<div id="footerright">
<button onclick="location.href='about.html'">About</button>
</div>
</div>
</div>


</body>
</html>
