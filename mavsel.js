<?php
  /*
  Plugin Name: MAVSEL post-comment-vote analyzer
  Plugin URI: http://www.ieru.org/projects/mavsel/
  Description: Plugin for extracting interation data from a blog-based course
  Author: J. Minguillón, C. Córcoles, C. Casado - MAVSEL project (UOC)
  Version: 0.3
  Author URI: http://www.ieru.org/projects/mavsel/
  */
?>
<?php
/**
* Definició de la classe
*/
class Mavsel {
	
	function __construct()	{
		add_action('admin_menu', array($this,'menu'));
		add_action('init', array($this,'generar_csv'));
	}


// Creamos la acción de la creación del menú

// Creamos el menú con un submenú con add_menu_page y add_submenu_page
	function menu() {
		$blogs_menu_main = add_menu_page('Config', 'MAVSEL', 'administrator', 'slug_menu', array($this,'mavsel_menu'));
	}

// Definimos los archivos php que se mostrarán al presionar las opciones del menú
	function mavsel_menu() {
	?>
    	<div class='wrap'><h2>MAVSEL - GD Star Rating's database download.</h2></div>
	
		<?php  
	
		if (!is_plugin_active("gd-star-rating/gd-star-rating.php")) {
			/* Informo al usuario de que es necesario tener el plugin instalado */
			?>
			<h3>Error</h3>
			<p>In order to download the GD Star Rating's database, plugin must be installed.</p>
			<?php
		} else {
		  
		  echo '<script language="javascript" src="'.plugins_url("mavsel.js", __FILE__ ).'"></script>';
			echo '<div class="wrap">';
    	    // Header
    	  	echo '<form method="post" action="" enctype="multipart/form-data" onsubmit="return comprueba_fechas()">';
    	  	wp_nonce_field( 'mavsel_export', '_wpnonce-mavsel-export' ); 
			// Filtro por fechas
			?>
			<fieldset style="width:20em; border:thin inset #aaa; padding: 0.5em 0 0.5em 1em;">
			<legend>For registered users I must display:</legend>
			<label>
		    <input type="radio" name="RadioGroup1" value="ID" id="RadioGroup1_0" />    ID</label>
			<br />
			<label>
		    <input type="radio" name="RadioGroup1" value="NE" id="RadioGroup1_1"  checked="checked" />    Name and email</label>
			</fieldset>
		<!-- Char encoding -->
			<fieldset style="width:20em; border:thin inset #aaa; padding: 0.5em 0 0.5em 1em;">
			<legend>Character encoding:</legend>
			<label>
		    <input type="radio" name="RadioGroup2" value="ISO" id="RadioGroup2_0" />    ISO-8859-1</label>
			<br />
			<label>
		    <input type="radio" name="RadioGroup2" value="UTF" id="RadioGroup2_1"  checked="checked" />    UTF-8</label>
			</fieldset>
		<!-- End char encoding -->
			<p><input id="Filtrar" name="Filtrar" type="checkbox" value="filter" onclick="filtrar()"/> Filter by date</p>
			<p><label for="Data inici" class="Date" style="color:#999">Start date</label> <input name="Datainici" type="text" disabled="disabled" id="DI" value="yyyy-mm-dd" maxlength="10" onkeyup="cFecha('DI')" />
			<label for="Data final" class="Date" style="color:#999">End date</label> <input name="Datafinal" type="text" disabled="disabled" id="DF" value="yyyy-mm-dd" maxlength="10" onkeyup="cFecha('DF')" />
			<input type="hidden" name="_wp_http_referer" value="" />
			</p>
			<?php
    	  	echo '<input type="hidden" name="_wp_http_referer" value="'. $_SERVER['REQUEST_URI'] .'" />';
    	  	echo '<br /><input type="submit" class="button-primary" value="Export" />';
    	  	echo '</form>';
    		echo '</div>';
    	}	
	
	}


	function generar_csv() {
		if ( isset( $_POST['_wpnonce-mavsel-export'] ) ) {

          	$sitename = sanitize_key( get_bloginfo( 'name' ) );
      	  	if ( ! empty( $sitename ) )
        		$sitename .= '.';
      		$fileName = $sitename . 'MAVSEL.' . date( 'Y-m-d-H-i-s' ) . '.csv';
 
			header("Cache-Control: must-revalidate, post-check=0, pre-check=0");
			header('Content-Description: File Transfer');
			header("Content-type: text/csv");
			header("Content-Disposition: attachment; filename={$fileName}");
			header("Expires: 0");
			header("Pragma: public");
 
			$fh = @fopen( 'php://output', 'w' );
 
			global $wpdb;
			
			$dataIni = "";
			$dataFin = "";
			// Comprova l'existència de les dates d'inici i fi
			if (isset ( $_POST['Datainici']) && isset ( $_POST['Datafinal'])) {
				// Comprova que les dates siguin correctes. 
				// Doble feina, dates correctes i eliminació de problemes d'injecció de codi
				$re="/^[0-9][0-9][0-9][0-9]\-[0-9][0-9]\-[0-9][0-9]$/";
				if (preg_match($re, $_POST['Datainici']) && preg_match($re, $_POST['Datafinal'])) {
					$dataIni = $_POST['Datainici'];
					$dataFin = $_POST['Datafinal'];
				}
			}
			// Comprova si s'ha de fer servir l'ID o el nom i l'adreça de correu electrònic
			$ide = true;
			if ($_POST['RadioGroup1'] === 'NE') { 
				$ide = false;
			}
		    // Si tenim dates les fem servir
			if ($dataIni!="") {
				// POSTS
				$query1 = "SELECT post_date, ".($ide?"post_author":"concat_ws('/',user_nicename,user_email)").", 'POST', 'NA', $wpdb->posts.ID from $wpdb->posts, $wpdb->users where post_status='publish' and post_type='post' and post_author=$wpdb->users.ID and post_date >= '".$dataIni."' and post_date <= '".$dataFin."' order by post_date;";
			    // Comentaris a POSTs
				$query2 = "SELECT comment_date, comment_author, 'COMPOST', comment_post_ID, comment_ID from $wpdb->comments where comment_type='' and comment_approved=1 and comment_parent=0 and comment_date >= '".$dataIni."' and comment_date <= '".$dataFin."';";			
				// Comentaris a comentaris	
				$query3 = "SELECT comment_date, comment_author, 'COMCOM', comment_parent, comment_ID from $wpdb->comments where comment_type='' and comment_approved=1 and comment_parent<>0 and comment_date >= '".$dataIni."' and comment_date <= '".$dataFin."';";
				// vots a posts
				$query4 = "SELECT voted, user_id, 'VOTEPOST', id, vote from cOD_gdsr_votes_log where vote_type='article' and voted >= '".$dataIni."' and voted <= '".$dataFin."' order by voted;";
				// vots a comentaris
				$query5 = "SELECT voted, user_id, 'VOTECOM', id, vote from cOD_gdsr_votes_log where vote_type='comment' and voted >= '".$dataIni."' and voted <= '".$dataFin."' order by voted;";
			} else { // I si no, no.		
				// POSTS
				$query1 = "SELECT post_date, ".($ide?"post_author":"concat_ws('/',user_nicename,user_email)").", 'POST', 'NA', $wpdb->posts.ID from $wpdb->posts, $wpdb->users where post_status='publish' and post_type='post' and post_author=$wpdb->users.ID order by post_date;";
			  	// Comentaris a POSTs
				$query2 = "SELECT comment_date, comment_author, 'COMPOST', comment_post_ID, comment_ID from $wpdb->comments where comment_type='' and comment_approved=1 and comment_parent=0;";			
				// Comentaris a comentaris	
				$query3 = "SELECT comment_date, comment_author, 'COMCOM', comment_parent, comment_ID from $wpdb->comments where comment_type='' and comment_approved=1 and comment_parent<>0;";
				// vots a posts
				$query4 = "SELECT voted, user_id, 'VOTEPOST', id, vote from cOD_gdsr_votes_log where vote_type='article' order by voted;";
				// vots a comentaris
				$query5 = "SELECT voted, user_id, 'VOTECOM', id, vote from cOD_gdsr_votes_log where vote_type='comment' order by voted;";
			}
			
			$result1=$wpdb->get_results($query1, ARRAY_N);	
			$result2=$wpdb->get_results($query2, ARRAY_N);
			$result3=$wpdb->get_results($query3, ARRAY_N);
			$result4=$wpdb->get_results($query4, ARRAY_N);
			$result5=$wpdb->get_results($query5, ARRAY_N);	
		  
		    // Afegeixo la capçalera
 			fputcsv($fh, array("Time","User","Service","Resource (comment)","Resource (post)","Result"));

			foreach ( $result1 as $data ) {
				fputcsv($fh, $data);
			}
		  if ($_POST['RadioGroup2'] === "ISO") {
			$codificacio = "ISO-8859-1";
		  } else {
			$codificacio = "UTF-8";
		  }
			foreach ( $result2 as $data ) {
				// Conversió per evitar problemes amb els caràcters especials
			    //$data[1] = mb_convert_encoding($data[1],"ISO-8859-1");
			    $data[1] = mb_convert_encoding($data[1],$codificacio);
				fputcsv($fh, $data);
			}
			foreach ( $result3 as $data ) {
				fputcsv($fh, $data);
			}
			foreach ( $result4 as $data ) {
				fputcsv($fh, $data);
			}
			foreach ( $result5 as $data ) {
				fputcsv($fh, $data);
			}
			// Close the file
			fclose($fh);
			exit;
		}
	}
} // Fin classe
new Mavsel;
?>
