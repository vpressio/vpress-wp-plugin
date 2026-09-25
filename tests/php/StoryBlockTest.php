<?php
/**
 * `vpress/story` + `vpress/story-step`: block metadata, overrides
 * sanitisation, and what render.php actually prints.
 *
 * The load-bearing claim these tests exist to keep honest is the one most
 * likely to rot: with JavaScript off the figure still renders and every
 * step's prose is present, in document order.
 *
 * @package Vpress
 */

use PHPUnit\Framework\Attributes\PreserveGlobalState;
use PHPUnit\Framework\Attributes\RunTestsInSeparateProcesses;
use PHPUnit\Framework\TestCase;

/*
 * vpress_render_figure() / vpress_enqueue_embed_assets() keep function
 * statics, so each test runs in its own process.
 */
#[RunTestsInSeparateProcesses]
#[PreserveGlobalState( false )]
final class StoryBlockTest extends TestCase {

	protected function setUp(): void {
		$GLOBALS['wpdb'] = new Vpress_Test_Wpdb();
	}

	private function seed_public_chart(): void {
		$GLOBALS['wpdb']->rows[1] = array(
			'id'          => '1',
			'dataset_id'  => '7',
			'title'       => 'Quejas por mes',
			'description' => '',
			'permissions' => 'public',
			'value'       => json_encode(
				array(
					'chart'       => 'bars',
					'subtitle'    => 'Datos de ejemplo',
					'annotations' => array(
						array( 'id' => 'a1', 'type' => 'point', 'x' => 'Oct', 'y' => 688, 'label' => '+73%' ),
					),
				)
			),
		);
	}

	/**
	 * The three steps the tests narrate with. The second carries a state; the
	 * third carries prose only, which is the commonest step there is.
	 */
	private function steps(): array {
		return array(
			array(
				'heading'   => 'Todo el año',
				'text'      => '<strong>Doce meses</strong> de quejas.',
				'overrides' => array( 'show' => array() ),
			),
			array(
				'heading'   => 'El pico de octubre',
				'text'      => 'Octubre rompe la serie.',
				'overrides' => array( 'show' => array( 'a1' ), 'emphasize' => array( 'a1' ) ),
			),
			array(
				'heading' => 'Lo que vino después',
				'text'    => 'El pico movió el piso.',
			),
		);
	}

	/** Render one step the way WordPress renders an inner block. */
	private function render_step( array $attributes ): string {
		$content = '';
		$block   = null;
		ob_start();
		include VPRESS_PLUGIN_DIR . 'blocks/story-step/render.php';
		return (string) ob_get_clean();
	}

	/**
	 * Render the story the way WordPress does: inner blocks first, their
	 * output handed to the parent as $content (WP_Block::render()).
	 *
	 * @param array      $attributes Story attributes.
	 * @param array|null $steps      Step attributes, or null for none.
	 */
	private function render_story( array $attributes, ?array $steps = null ): string {
		$steps = null === $steps ? $this->steps() : $steps;

		$content = '';
		foreach ( $steps as $step ) {
			$content .= $this->render_step( $step );
		}

		// What WordPress hands render.php: the parsed block, so the story can
		// read its first step's heading for the live region.
		$block               = new stdClass();
		$block->parsed_block = array(
			'blockName'   => 'vpress/story',
			'attrs'       => $attributes,
			'innerBlocks' => array_map(
				static fn( $step ) => array( 'blockName' => 'vpress/story-step', 'attrs' => $step ),
				$steps
			),
		);

		ob_start();
		include VPRESS_PLUGIN_DIR . 'blocks/story/render.php';
		return (string) ob_get_clean();
	}

	/* ------------------------------------------------------------ metadata */

	public function test_story_block_json_declares_the_parent(): void {
		$meta = json_decode( (string) file_get_contents( VPRESS_PLUGIN_DIR . 'blocks/story/block.json' ), true );

		$this->assertSame( 3, $meta['apiVersion'] );
		$this->assertSame( 'vpress/story', $meta['name'] );
		$this->assertSame( array( 'type' => 'integer' ), $meta['attributes']['chartId'] );
		$this->assertSame( array( 'type' => 'boolean', 'default' => true ), $meta['attributes']['showCaption'] );
		$this->assertSame( array( 'vpress/chartId' => 'chartId' ), $meta['providesContext'] );
		$this->assertSame( 'file:./render.php', $meta['render'] );
		$this->assertArrayNotHasKey( 'viewScriptModule', $meta, 'vpress_render_figure() enqueues the front-end assets' );
		foreach ( array( 'editorScript', 'editorStyle', 'render' ) as $key ) {
			$this->assertFileExists( VPRESS_PLUGIN_DIR . 'blocks/story/' . substr( $meta[ $key ], strlen( 'file:./' ) ) );
		}
	}

	public function test_step_block_json_declares_the_child(): void {
		$meta = json_decode( (string) file_get_contents( VPRESS_PLUGIN_DIR . 'blocks/story-step/block.json' ), true );

		$this->assertSame( 'vpress/story-step', $meta['name'] );
		$this->assertSame( array( 'vpress/story' ), $meta['parent'] );
		$this->assertSame( array( 'vpress/chartId' ), $meta['usesContext'] );
		$this->assertSame( array( 'type' => 'string', 'default' => '' ), $meta['attributes']['heading'] );
		$this->assertSame( array( 'type' => 'string', 'default' => '' ), $meta['attributes']['text'] );
		$this->assertSame( array( 'type' => 'object', 'default' => array() ), $meta['attributes']['overrides'] );
	}

	public function test_the_parent_only_allows_its_own_step(): void {
		$editor = (string) file_get_contents( VPRESS_PLUGIN_DIR . 'blocks/story/index.js' );

		$this->assertStringContainsString( "var ALLOWED = [ 'vpress/story-step' ];", $editor );
		$this->assertStringContainsString(
			"var TEMPLATE = [ [ 'vpress/story-step' ], [ 'vpress/story-step' ] ];",
			$editor,
			'inserting a story gives you two empty steps'
		);
		$this->assertStringContainsString(
			'return el( InnerBlocks.Content );',
			$editor,
			'a dynamic PARENT must serialize its children, or a save drops every step'
		);
	}

	/* ---------------------------------------------------------- overrides */

	public function test_overrides_keep_only_what_the_front_end_reads(): void {
		$overrides = vpress_story_overrides(
			array(
				'show'      => array( 'A1', ' a2 ', 'not a valid id!', 'a1', 1 ),
				'emphasize' => array( 'a2' ),
				'hide'      => array( 'a3' ),
				'title'     => "  Octubre  \n rompe ",
				'chartType' => 'timeline',
				'filters'   => array( array( 'slug' => 'mes', 'type' => 'ordinal', 'value' => array( 'Oct', 'Nov' ) ) ),
				'nonsense'  => 'dropped',
			)
		);

		$this->assertSame(
			array(
				'show'      => array( 'a1', 'a2', '1' ),
				'emphasize' => array( 'a2' ),
				'hide'      => array( 'a3' ),
				'filters'   => array( array( 'slug' => 'mes', 'type' => 'ordinal', 'value' => array( 'Oct', 'Nov' ) ) ),
				'title'     => 'Octubre rompe',
				'chartType' => 'timeline',
			),
			$overrides
		);
		$this->assertSame(
			array( 'show', 'emphasize', 'hide', 'filters', 'title', 'chartType' ),
			array_keys( $overrides ),
			'canonical key order, so the printed JSON is stable across renders'
		);
	}

	public function test_show_absent_and_show_empty_are_different_states(): void {
		$this->assertSame( array(), vpress_story_overrides( array() ), 'no show key: every annotation stays visible' );
		$this->assertSame(
			array( 'show' => array() ),
			vpress_story_overrides( array( 'show' => array() ) ),
			'an empty allow-list means none — the state of a step that has revealed nothing yet'
		);
	}

	public function test_a_chart_type_a_step_cannot_draw_is_dropped_not_passed_through(): void {
		// treemap draws, but the chart container's config watcher THROWS on
		// it, so a step that switched to one would be an uncaught exception.
		$this->assertSame( array(), vpress_story_overrides( array( 'chartType' => 'treemap' ) ) );
		// map passes that watcher and then draws nothing: its topojson 404s
		// and Leaflet builds no scales that mean anything in data space.
		$this->assertSame( array(), vpress_story_overrides( array( 'chartType' => 'map' ) ) );
		$this->assertSame( array(), vpress_story_overrides( array( 'chartType' => 'sunburst' ) ) );

		$this->assertSame(
			array( 'bars', 'heatmap', 'spineplot', 'scatter', 'timeline' ),
			vpress_story_chart_types(),
			'every offered type has to be one a step can actually draw'
		);
		$this->assertSame( array( 'chartType' => 'bars' ), vpress_story_overrides( array( 'chartType' => 'bars' ) ) );
	}

	public function test_empty_optional_overrides_are_omitted_rather_than_blank(): void {
		$this->assertSame(
			array(),
			vpress_story_overrides( array( 'title' => '   ', 'chartType' => '', 'filters' => array() ) ),
			'an empty title override would blank the caption instead of leaving it alone'
		);
	}

	public function test_malformed_overrides_are_an_empty_state_not_an_error(): void {
		$this->assertSame( array(), vpress_story_overrides( null ) );
		$this->assertSame( array(), vpress_story_overrides( 'not json' ) );
		$this->assertSame( array(), vpress_story_overrides( 17 ) );
		$this->assertSame( array( 'show' => array( 'a1' ) ), vpress_story_overrides( '{"show":["a1"]}' ) );
		$this->assertSame( array( 'show' => array() ), vpress_story_overrides( array( 'show' => array( array( 'nested' ) ) ) ) );
	}

	public function test_filters_keep_the_shape_the_query_builder_consumes(): void {
		$this->assertSame(
			array(
				'filters' => array(
					array( 'slug' => 'mes', 'type' => 'ordinal', 'value' => array( 'Oct' ) ),
					array( 'slug' => 'total', 'type' => 'linear', 'value' => array( 0, 100 ) ),
				),
			),
			vpress_story_overrides(
				array(
					'filters' => array(
						array( 'slug' => 'mes', 'value' => array( 'Oct' ) ),
						array( 'slug' => 'total', 'type' => 'linear', 'value' => array( 0, 100 ) ),
						array( 'slug' => 'sin valores', 'value' => array() ),
						array( 'type' => 'ordinal', 'value' => array( 'x' ) ),
						'nonsense',
					),
				)
			)
		);
	}

	/* ------------------------------------------------------------- render */

	public function test_render_prints_the_figure_then_every_step_in_order(): void {
		$this->seed_public_chart();

		$html = $this->render_story( array( 'chartId' => 1 ) );

		$this->assertStringStartsWith( '<section class="wp-block-vpress-chart vpress-story" data-vpress-story=""', $html );
		$this->assertStringContainsString( 'data-vpress-chart="1"', $html );
		$this->assertStringContainsString( '<figcaption class="vpress-figure__caption">', $html );

		// The reading order IS the no-JavaScript story: chart, then prose.
		// Measured from the steps container, because the live region above
		// the figure legitimately repeats the first step's heading.
		$figure = strpos( $html, 'data-vpress-chart="1"' );
		$steps  = strpos( $html, '<div class="vpress-story__steps">' );
		$first  = strpos( $html, 'Todo el año', $steps );
		$second = strpos( $html, 'El pico de octubre', $steps );
		$third  = strpos( $html, 'Lo que vino después', $steps );
		$this->assertNotFalse( $third );
		$this->assertLessThan( $steps, $figure, 'the figure precedes the prose' );
		$this->assertLessThan( $second, $first );
		$this->assertLessThan( $third, $second );

		$this->assertSame( 3, substr_count( $html, 'class="wp-block-vpress-chart vpress-story__step"' ) );
		$this->assertContains( 'wp_enqueue_script_module', array_column( $GLOBALS['vpress_test_calls'], 0 ), 'the figure enqueues the embed' );
	}

	public function test_every_steps_prose_is_present_with_no_javascript(): void {
		$this->seed_public_chart();

		$html = $this->render_story( array( 'chartId' => 1 ) );

		// The prose itself, the chart's own description and its data table:
		// nothing here needs a script to be readable.
		foreach ( array( 'Doce meses', 'Octubre rompe la serie.', 'El pico movió el piso.' ) as $prose ) {
			$this->assertStringContainsString( $prose, $html );
		}
		$this->assertStringContainsString( '<h3 class="vpress-story__heading">Todo el año</h3>', $html );
		$this->assertStringNotContainsString( '<script', $html );
	}

	public function test_the_live_region_names_the_first_step_at_rest(): void {
		$this->seed_public_chart();

		$html = $this->render_story( array( 'chartId' => 1 ) );

		$this->assertStringContainsString(
			'<p class="vpress-story__now" data-vpress-story-status role="status" aria-live="polite">Todo el año</p>',
			$html
		);
	}

	public function test_the_live_region_is_trimmed_so_the_controller_can_compare_it(): void {
		// The editor stores the raw field value, so a heading can arrive padded.
		// The controller trims its own heading before asking whether the region
		// already shows it; an untrimmed value here makes them unequal and the
		// region is rewritten at boot with text it already displayed — which is
		// a live-region mutation, and some assistive tech reads it out.
		$this->seed_public_chart();

		$html = $this->render_story(
			array( 'chartId' => 1 ),
			array( array( 'heading' => '  Todo el año  ', 'overrides' => array() ) )
		);

		$this->assertStringContainsString(
			'aria-live="polite">Todo el año</p>',
			$html,
			'the live region carries the trimmed heading'
		);
	}

	public function test_overrides_are_escaped_into_the_step_attribute(): void {
		$this->seed_public_chart();

		$html = $this->render_story(
			array( 'chartId' => 1 ),
			array(
				array(
					'heading'   => 'Paso',
					'overrides' => array(
						'show'  => array( 'a1' ),
						'title' => 'Se dice "octubre" & <script>alert(1)</script>',
					),
				),
			)
		);

		// Two escapings, in order: JSON (a quote becomes \") then esc_attr (a
		// quote becomes &quot;, an ampersand &amp;). The quote the author typed
		// therefore cannot end the attribute, and the script is gone before
		// either of them ran.
		$this->assertStringContainsString(
			'data-vpress-step="{&quot;show&quot;:[&quot;a1&quot;],&quot;title&quot;:&quot;Se dice \\&quot;octubre\\&quot; &amp;&quot;}"',
			$html
		);
		$this->assertStringNotContainsString( '<script', $html );
		$this->assertStringNotContainsString( 'alert(1)', $html );
		$this->assertSame( 1, substr_count( $html, 'data-vpress-step=' ) );

		// And it decodes back to the object story.js expects.
		preg_match( '/data-vpress-step="([^"]*)"/', $html, $attribute );
		$this->assertSame(
			array( 'show' => array( 'a1' ), 'title' => 'Se dice "octubre" &' ),
			json_decode( html_entity_decode( $attribute[1], ENT_QUOTES, 'UTF-8' ), true )
		);
	}

	public function test_a_step_with_no_state_still_carries_an_object(): void {
		$this->assertStringContainsString(
			'data-vpress-step="{}"',
			$this->render_step( array( 'heading' => 'Solo prosa' ) ),
			'story.js parses this attribute on every step; an absent or empty one must still be an object'
		);
	}

	public function test_the_step_renders_standalone(): void {
		$html = $this->render_step( $this->steps()[1] );

		$this->assertStringStartsWith( '<div class="wp-block-vpress-chart vpress-story__step"', $html );
		$this->assertStringEndsWith( '</div>', $html );
		$this->assertStringContainsString( '<h3 class="vpress-story__heading">El pico de octubre</h3>', $html );
		$this->assertStringContainsString( '<div class="vpress-story__text">Octubre rompe la serie.</div>', $html );
	}

	public function test_step_rich_text_keeps_its_formatting_and_loses_everything_else(): void {
		$html = $this->render_step(
			array(
				'heading' => 'Uno & dos',
				'text'    => '<strong>Fuerte</strong> y <em onclick="x()">cursiva</em><iframe src="evil"></iframe>',
			)
		);

		$this->assertStringContainsString( '<strong>Fuerte</strong>', $html );
		$this->assertStringContainsString( '<em>cursiva</em>', $html );
		$this->assertStringNotContainsString( 'onclick', $html );
		$this->assertStringNotContainsString( '<iframe', $html );
		// The heading is plain text (PlainText in the editor), so esc_html()
		// is the right escaping and cannot double-encode.
		$this->assertStringContainsString( '<h3 class="vpress-story__heading">Uno &amp; dos</h3>', $html );
	}

	public function test_show_caption_false_omits_the_figcaption(): void {
		$this->seed_public_chart();

		$html = $this->render_story( array( 'chartId' => 1, 'showCaption' => false ) );

		$this->assertStringContainsString( 'data-vpress-chart="1"', $html );
		$this->assertStringNotContainsString( '<figcaption', $html );
		$this->assertStringContainsString( 'aria-label="Quejas por mes"', $html, 'the chart keeps its accessible name' );
		$this->assertStringContainsString( 'El pico de octubre', $html, 'and the steps are untouched' );
	}

	public function test_a_private_chart_renders_nothing_for_a_visitor(): void {
		$this->seed_public_chart();
		$GLOBALS['wpdb']->rows[1]['permissions'] = 'private';

		$html = $this->render_story( array( 'chartId' => 1 ) );

		$this->assertSame( '', $html, 'a story about a chart nobody may see is not a story' );
	}

	public function test_a_private_chart_leaks_no_step_prose_either(): void {
		$this->seed_public_chart();
		$GLOBALS['wpdb']->rows[1]['permissions'] = 'private';

		$html = $this->render_story( array( 'chartId' => 1 ) );

		// The steps were rendered before the parent ran — the parent still
		// has to drop them, or the narrative about a private chart is public.
		$this->assertStringNotContainsString( 'El pico de octubre', $html );
		$this->assertStringNotContainsString( 'data-vpress-step', $html );
	}

	public function test_an_unknown_chart_tells_editors_and_shows_visitors_nothing(): void {
		$this->assertSame( '', $this->render_story( array( 'chartId' => 42 ) ) );
		$this->assertSame( '', $this->render_story( array() ) );

		$GLOBALS['vpress_test_caps'] = array( 'edit_posts' );
		$this->assertStringContainsString( 'chart #42 is not available', $this->render_story( array( 'chartId' => 42 ) ) );
		$this->assertStringContainsString( 'no chart selected for this story', $this->render_story( array() ) );
		$this->assertSame( array(), $GLOBALS['vpress_test_calls'], 'nothing is enqueued without a figure' );
	}

	public function test_wrapper_attributes_cannot_break_out_or_override_the_contract(): void {
		$this->seed_public_chart();
		// One wrapper string stands in for every block here, so this renders
		// with no steps: what is under test is the SECTION's own attributes.
		$GLOBALS['vpress_test_wrapper'] = 'class="wp-block-vpress-story alignwide" id="quejas" style="margin-top:2rem;" data-vpress-story="999" onclick="alert(1)"';

		$html = $this->render_story( array( 'chartId' => 1 ), array() );

		$this->assertStringStartsWith( '<section class="wp-block-vpress-story alignwide vpress-story" data-vpress-story=""', $html );
		$this->assertSame( 1, substr_count( $html, 'alignwide' ), 'align class is not duplicated' );
		$this->assertSame( 1, substr_count( $html, 'data-vpress-story=' ) );
		$this->assertStringNotContainsString( '999', $html );
		$this->assertStringContainsString( ' id="quejas"', $html );
		$this->assertStringContainsString( ' style="margin-top:2rem;"', $html );
		$this->assertStringNotContainsString( 'onclick', $html );
	}

	public function test_a_step_cannot_be_given_a_data_vpress_attribute_by_its_wrapper(): void {
		$GLOBALS['vpress_test_wrapper'] = 'class="wp-block-vpress-story-step" data-vpress-step="{}" onmouseover="x()" title="a &amp; b"';

		$html = $this->render_step( array( 'heading' => 'Paso', 'overrides' => array( 'show' => array( 'a1' ) ) ) );

		$this->assertSame( 1, substr_count( $html, 'data-vpress-step=' ) );
		$this->assertStringContainsString( '&quot;a1&quot;', $html, 'the renderer owns the step state' );
		$this->assertStringNotContainsString( 'onmouseover', $html );
		$this->assertStringContainsString( ' title="a &amp; b"', $html, 'values are escaped once, not double-encoded' );
	}

	public function test_a_story_with_no_steps_is_still_a_readable_figure(): void {
		$this->seed_public_chart();

		$html = $this->render_story( array( 'chartId' => 1 ), array() );

		$this->assertStringContainsString( 'data-vpress-chart="1"', $html );
		$this->assertStringContainsString( '<div class="vpress-story__steps"></div>', $html );
		$this->assertStringContainsString(
			'aria-live="polite"></p>',
			$html,
			'no steps, no heading to announce — and no placeholder invented for one'
		);
	}
}
