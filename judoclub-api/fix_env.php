<?php
$env_file = '.env';
$content = file_get_contents($env_file);

// Fix the MAIL settings
$content = preg_replace('/MAIL_PASSWORD=.*/', 'MAIL_PASSWORD="nwub ilpc gqco pvjy"', $content);
$content = preg_replace('/MAIL_FROM_ADDRESS=.*/', 'MAIL_FROM_ADDRESS=Stijn.mattheus@outlook.com', $content);
$content = preg_replace('/MAIL_USERNAME=.*/', 'MAIL_USERNAME=Stijn.mattheus@outlook.com', $content);
$content = preg_replace('/MAIL_HOST=.*/', 'MAIL_HOST=smtp.gmail.com', $content);
$content = preg_replace('/MAIL_FROM_NAME=.*/', 'MAIL_FROM_NAME="Judo Ardooie"', $content);

file_put_contents($env_file, $content);
echo ".env file fixed!\n";
