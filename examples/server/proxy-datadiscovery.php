<?php

$url = $_GET['url'];
$result = "";
if (strpos($url, "http://apps.socib.es/DataDiscovery/") == 0){
    $result = file_get_contents($url);
    $nlines = count($http_response_header);
    for ($i = $nlines-1; $i >= 0; $i--) {
        $line = $http_response_header[$i];
        if (substr_compare($line, 'Content-Type', 0, 12, true) == 0) {
            $content_type = $line;
            break;
        }
    }
    header($content_type);
    echo $result;
} else{
    header('HTTP/1.0 400 Bad Request');
    echo 'Request not valid';
}
?>
