<?php
    include_once ( str_replace('\\','/',dirname(__FILE__) ) ."/GIFDecoder.class.php" );

	$animation = 'gears.gif';

  	$gifDecoder = new GIFDecoder ( fread ( fopen ( $animation, "rb" ), filesize ( $animation ) ) );

	$i = 1;
	foreach ( $gifDecoder -> GIFGetFrames ( ) as $frame ) {
		if ( $i < 10 ) {
			fwrite ( fopen ( "frames/frame0$i.gif" , "wb" ), $frame );
		}
		else {
			fwrite ( fopen ( "frames/frame$i.gif" , "wb" ), $frame );
		}
		$i++;
	}
?>
