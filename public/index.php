<?php
/**
 * Standalone `/chart/{id}` page: one chart figure, nothing else.
 *
 * @package    Vpress
 * @subpackage Vpress/public
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

$vpress_chart_id = (int) get_query_var( 'chart' );
// Render before any output: the figure decides the status code and enqueues its assets.
$vpress_figure = vpress_render_figure( $vpress_chart_id );

if ( '' === $vpress_figure ) {
	status_header( 404 );
	nocache_headers();
}
// schema.org Dataset for the chart (escaped for a <script> element by the helper).
$vpress_json_ld = '' !== $vpress_figure ? vpress_chart_json_ld( $vpress_chart_id ) : '';
?><!doctype html>
<html <?php language_attributes(); ?>>
<head>
<meta charset="<?php bloginfo( 'charset' ); ?>">
<meta name="viewport" content="width=device-width, initial-scale=1">
<?php wp_head(); ?>
<?php
if ( '' !== $vpress_json_ld ) {
	echo $vpress_json_ld . "\n"; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- JSON_HEX_TAG-encoded in vpress_chart_json_ld().
}
?>
</head>
<body class="vpress-chart-page">
<main class="vpress-chart-page__main">
<?php
if ( '' !== $vpress_figure ) {
	echo $vpress_figure; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- escaped inside vpress_render_figure().
} else {
	echo '<p class="vpress-chart-page__missing">' . esc_html__( 'Gráfica no disponible', 'vpress' ) . '</p>';
}
?>
</main>
<footer class="vpress-chart-page__footer"><a href="<?php echo esc_url( home_url() ); ?>"><?php echo esc_html( get_bloginfo( 'name' ) ); ?></a> · <a href="https://gitlab.com/vpress/vpress-wp-plugin">Vpress</a></footer>
<?php wp_footer(); ?>
</body>
</html>
