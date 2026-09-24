<?php
/**
 * vpress_render_figure() / vpress_get_public_chart().
 *
 * @package Vpress
 */

use PHPUnit\Framework\Attributes\PreserveGlobalState;
use PHPUnit\Framework\Attributes\RunTestsInSeparateProcesses;
use PHPUnit\Framework\TestCase;

/*
 * vpress_enqueue_embed_assets() keeps a function-static "done" flag, so each
 * test runs in its own process to observe enqueues from a clean slate.
 */
#[RunTestsInSeparateProcesses]
#[PreserveGlobalState( false )]
final class FigureTest extends TestCase {

	protected function setUp(): void {
		$GLOBALS['wpdb'] = new Vpress_Test_Wpdb();
	}

	private function chart( array $overrides = array() ): array {
		return array_merge(
			array(
				'id'          => '1',
				'dataset_id'  => '7',
				'title'       => 'Ventas por estado',
				'description' => '',
				'permissions' => 'public',
				'value'       => json_encode(
					array(
						'chart'    => 'bars',
						'theme'    => 'light',
						'title'    => 'Title from value',
						'subtitle' => 'Suma de ventas, 2026',
					)
				),
			),
			$overrides
		);
	}

	private function seed( array $row ): void {
		$GLOBALS['wpdb']->rows[ (int) $row['id'] ] = $row;
	}

	public function test_private_chart_is_hidden_from_anonymous_visitors(): void {
		$this->seed( $this->chart( array( 'permissions' => 'private' ) ) );

		$this->assertNull( vpress_get_public_chart( 1 ) );
		$this->assertSame( '', vpress_render_figure( 1 ) );
		$this->assertSame( array(), $GLOBALS['vpress_test_calls'], 'nothing is enqueued for a hidden chart' );
	}

	public function test_private_chart_is_visible_to_editors(): void {
		$this->seed( $this->chart( array( 'permissions' => 'private' ) ) );
		$GLOBALS['vpress_test_caps'] = array( 'edit_posts' );

		$this->assertStringContainsString( 'data-vpress-chart="1"', vpress_render_figure( 1 ) );
	}

	public function test_missing_chart_renders_nothing(): void {
		$this->assertSame( '', vpress_render_figure( 99 ) );
		$this->assertSame( '', vpress_render_figure( 0 ) );
	}

	public function test_public_chart_renders_the_figure_contract(): void {
		$this->seed( $this->chart() );

		$html = vpress_render_figure( 1, array( 'align' => 'wide' ) );

		$this->assertStringStartsWith( '<figure class="vpress-figure vpress-figure--bars vpress-figure--light alignwide"', $html );
		$this->assertStringContainsString( 'id="vpress-figure-1"', $html );
		$this->assertStringContainsString( 'data-vpress-chart="1"', $html );
		$this->assertStringContainsString( 'data-vpress-rest="http://example.test/wp-json/vpress/v1/"', $html );
		$this->assertStringContainsString( '<div class="vpress-figure__chart" role="group" aria-label="Ventas por estado" aria-busy="true"></div>', $html );
		$this->assertStringContainsString( '<span class="vpress-figure__title">Ventas por estado</span>', $html );
		$this->assertStringContainsString( '<span class="vpress-figure__subtitle">Suma de ventas, 2026</span>', $html );
		$this->assertStringEndsWith( '</figcaption></figure>', $html );
	}

	public function test_title_falls_back_to_value_title_and_label_to_chart_number(): void {
		$this->seed( $this->chart( array( 'title' => '', 'value' => json_encode( array( 'chart' => 'map', 'theme' => 'dark', 'title' => 'Mapa' ) ) ) ) );
		$html = vpress_render_figure( 1 );
		$this->assertStringContainsString( 'vpress-figure--map vpress-figure--dark"', $html );
		$this->assertStringContainsString( '<span class="vpress-figure__title">Mapa</span>', $html );
		$this->assertStringNotContainsString( 'vpress-figure__subtitle', $html );

		$this->seed( $this->chart( array( 'id' => '2', 'title' => '', 'value' => '{}' ) ) );
		$this->assertStringContainsString( 'aria-label="Chart 2"', vpress_render_figure( 2 ) );
	}

	public function test_title_and_attributes_are_escaped(): void {
		$this->seed(
			$this->chart(
				array(
					'title' => '<b>x</b>" onmouseover="alert(1)',
					'value' => json_encode(
						array(
							'chart'    => 'bars" onclick="x',
							'subtitle' => '<script>alert(1)</script>',
						)
					),
				)
			)
		);

		$html = vpress_render_figure( 1, array( 'align' => '"><script>' ) );

		// Only the renderer's own tags may appear; no raw "<" from the data.
		$tags = array( '<figure ', '<div ', '</div>', '<figcaption ', '</figcaption>', '<span ', '</span>', '</figure>' );
		$this->assertStringNotContainsString( '<', str_replace( $tags, '', $html ), 'no raw < outside the renderer tags' );
		$this->assertStringNotContainsString( '<b>', $html );
		$this->assertStringNotContainsString( '<script>', $html );
		$this->assertStringContainsString( '&lt;b&gt;x&lt;/b&gt;', $html );
		$this->assertStringNotContainsString( '" onmouseover=', $html );
		$this->assertStringNotContainsString( 'onclick', $html );
		$this->assertStringContainsString( 'class="vpress-figure vpress-figure--bars vpress-figure--light"', $html, 'unknown chart type falls back to bars, unknown align is dropped' );
	}

	public function test_prod_enqueues_the_embed_module_and_stylesheet_once(): void {
		$this->seed( $this->chart() );

		vpress_render_figure( 1 );
		vpress_render_figure( 1 );

		$this->assertSame(
			array(
				array( 'wp_register_script_module', array( 'vpress-embed', 'http://example.test/wp-content/plugins/vpress/admin/dist/js/embed.js', array(), '0.2.0-test' ) ),
				array( 'wp_enqueue_script_module', array( 'vpress-embed' ) ),
				array( 'wp_enqueue_style', array( 'vpress-embed', 'http://example.test/wp-content/plugins/vpress/admin/dist/css/embed.css', array(), '0.2.0-test' ) ),
			),
			$GLOBALS['vpress_test_calls']
		);
	}

	public function test_dev_loads_the_vite_dev_server_entry(): void {
		$this->seed( $this->chart() );
		$GLOBALS['vpress_test_filters']['vpress_client'] = static function () {
			return array( 'env' => 'dev', 'location' => 'http://localhost:5180' );
		};

		vpress_render_figure( 1 );

		$this->assertContains( array( 'wp_register_script_module', array( 'vpress-embed', 'http://localhost:5180/src/embed.js', array( 'vpress-vite-client' ), null ) ), $GLOBALS['vpress_test_calls'] );
		$this->assertContains( array( 'wp_register_script_module', array( 'vpress-vite-client', 'http://localhost:5180/@vite/client', array(), null ) ), $GLOBALS['vpress_test_calls'] );
		$this->assertContains( array( 'wp_enqueue_script_module', array( 'vpress-embed' ) ), $GLOBALS['vpress_test_calls'] );
		$this->assertNotContains( 'wp_enqueue_style', array_column( $GLOBALS['vpress_test_calls'], 0 ), 'dev CSS comes from the Vite module' );
	}

	public function test_logged_in_viewers_get_a_rest_nonce_anonymous_markup_has_none(): void {
		$this->seed( $this->chart() );

		$this->assertStringNotContainsString( 'data-vpress-nonce', vpress_render_figure( 1 ) );

		$GLOBALS['vpress_test_logged_in'] = true;
		$this->assertStringContainsString( ' data-vpress-nonce="nonce-wp_rest">', vpress_render_figure( 1 ) );
	}

	public function test_repeat_renders_of_a_chart_get_distinct_ids(): void {
		$this->seed( $this->chart() );

		$first  = vpress_render_figure( 1 );
		$second = vpress_render_figure( 1 );
		$third  = vpress_render_figure( 1 );

		$this->assertStringContainsString( 'id="vpress-figure-1"', $first );
		$this->assertStringContainsString( 'id="vpress-figure-1-2"', $second );
		$this->assertStringContainsString( 'id="vpress-figure-1-3"', $third );
		$this->assertStringContainsString( 'data-vpress-chart="1"', $second, 'the chart id itself is unchanged' );
	}

	public function test_shortcode_rejects_non_numeric_ids(): void {
		$this->seed( $this->chart() );

		foreach ( array( '1 or 1', '-1', 'abc', '', '1.5', ' ' ) as $id ) {
			$this->assertSame( '', vpress_shortcode( array( 'id' => $id ) ), "id '{$id}'" );
		}
		$this->assertSame( '', vpress_shortcode( '' ), 'no attributes at all' );
		$this->assertSame( array(), $GLOBALS['vpress_test_calls'], 'nothing enqueued for rejected ids' );
	}

	public function test_shortcode_renders_the_figure_with_its_alignment(): void {
		$this->seed( $this->chart() );

		$this->assertStringStartsWith( '<figure class="vpress-figure vpress-figure--bars vpress-figure--light alignfull"', vpress_shortcode( array( 'id' => '1', 'align' => 'full', 'url' => 'http://legacy.test' ) ) );
		$this->assertStringContainsString( 'vpress-figure--light" id=', vpress_shortcode( array( 'id' => '1', 'align' => 'none' ) ) );
		$this->assertArrayHasKey( 'vpress', $GLOBALS['vpress_test_shortcodes'] );
	}
}
