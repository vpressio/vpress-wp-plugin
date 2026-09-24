<?php

use PHPUnit\Framework\TestCase;

/**
 * Anonymous callers see only public charts and datasets; edit_posts users
 * see everything.
 */
final class VisibilityTest extends TestCase {

	private FakeWpdb $wpdb;

	protected function setUp(): void {
		$this->wpdb      = new FakeWpdb();
		$GLOBALS['wpdb'] = $this->wpdb;
		$this->wpdb->on( '/vpresscore_charts WHERE id = 1$/', (object) array( 'id' => '1', 'permissions' => 'public' ) );
		$this->wpdb->on( '/vpresscore_charts WHERE id = 7$/', (object) array( 'id' => '7', 'permissions' => 'private' ) );
		$this->wpdb->on( '/vpresscore_datasets WHERE id = 2$/', (object) array( 'id' => '2', 'permissions' => 'public' ) );
		$this->wpdb->on( '/vpresscore_datasets WHERE id = 9$/', (object) array( 'id' => '9', 'permissions' => 'private' ) );
	}

	protected function tearDown(): void {
		$GLOBALS['vpress_test_caps'] = array();
	}

	private function as_editor(): void {
		$GLOBALS['vpress_test_caps'] = array( 'edit_posts' );
	}

	private function assertForbidden( $result ): void {
		$this->assertInstanceOf( WP_Error::class, $result );
		$this->assertSame( 'vpress_forbidden', $result->get_error_code() );
		$this->assertSame( array( 'status' => 403 ), $result->get_error_data() );
	}

	private function queries_matching( string $pattern ): array {
		return array_values( preg_grep( $pattern, $this->wpdb->queries ) );
	}

	private function list_request( string $q = '' ): FakeRestRequest {
		return new FakeRestRequest( array( 'q' => $q, 'page' => '2', 'perPage' => '6' ) );
	}

	public function test_list_charts_filters_to_public_for_anonymous_callers(): void {
		vpress_list_charts( $this->list_request() );

		$this->assertSame(
			array(
				"SELECT COUNT(*) AS total FROM wp_vpresscore_charts WHERE permissions = 'public'",
				"SELECT * FROM wp_vpresscore_charts WHERE permissions = 'public' ORDER BY updated DESC LIMIT 6, 6",
			),
			$this->wpdb->queries
		);
	}

	public function test_list_charts_shows_everything_to_editors(): void {
		$this->as_editor();
		vpress_list_charts( $this->list_request() );

		$this->assertSame(
			array(
				'SELECT COUNT(*) AS total FROM wp_vpresscore_charts',
				'SELECT * FROM wp_vpresscore_charts ORDER BY updated DESC LIMIT 6, 6',
			),
			$this->wpdb->queries
		);
	}

	public function test_list_charts_search_term_is_bound(): void {
		vpress_list_charts( $this->list_request( "X' OR 1=1 -- 50%" ) );

		$like = "'%x\\' or 1=1 -- 50\\\\%%'";
		$this->assertSame(
			"SELECT * FROM wp_vpresscore_charts WHERE permissions = 'public' AND (lower(value) LIKE $like OR lower(description) LIKE $like OR lower(tags) LIKE $like) ORDER BY updated DESC LIMIT 6, 6",
			$this->wpdb->queries[1]
		);
	}

	public function test_get_chart_forbids_a_private_chart_to_anonymous_callers(): void {
		$this->assertForbidden( vpress_get_chart( new FakeRestRequest( array( 'id' => '7' ) ) ) );
		$this->assertSame( '1', vpress_get_chart( new FakeRestRequest( array( 'id' => '1' ) ) )['data']->id );
	}

	public function test_get_chart_serves_a_private_chart_to_editors(): void {
		$this->as_editor();
		$this->assertSame( '7', vpress_get_chart( new FakeRestRequest( array( 'id' => '7' ) ) )['data']->id );
	}

	public function test_list_datasets_filters_to_public_for_anonymous_callers(): void {
		vpress_list_datasets( $this->list_request( 'ven' ) );

		$this->assertSame( "SELECT COUNT(*) AS total FROM wp_vpresscore_datasets as d WHERE d.permissions = 'public' AND (lower(d.slug) LIKE '%ven%' OR lower(d.name) LIKE '%ven%' OR lower(d.description) LIKE '%ven%' OR lower(d.tag) LIKE '%ven%')", $this->wpdb->queries[0] );
		$this->assertStringEndsWith( "WHERE d.permissions = 'public' AND (lower(d.slug) LIKE '%ven%' OR lower(d.name) LIKE '%ven%' OR lower(d.description) LIKE '%ven%' OR lower(d.tag) LIKE '%ven%') ORDER BY updated DESC LIMIT 6, 6", $this->wpdb->queries[1] );
	}

	public function test_list_datasets_shows_everything_to_editors(): void {
		$this->as_editor();
		vpress_list_datasets( $this->list_request() );

		$this->assertSame( 'SELECT COUNT(*) AS total FROM wp_vpresscore_datasets as d', $this->wpdb->queries[0] );
		$this->assertStringNotContainsString( 'WHERE', $this->wpdb->queries[1] );
	}

	public function test_get_dataset_forbids_a_private_dataset_to_anonymous_callers(): void {
		$this->assertForbidden( vpress_get_dataset( new FakeRestRequest( array( 'id' => '9' ) ) ) );
		$this->assertSame( '2', vpress_get_dataset( new FakeRestRequest( array( 'id' => '2' ) ) )['data']->id );

		$this->as_editor();
		$this->assertSame( '9', vpress_get_dataset( new FakeRestRequest( array( 'id' => '9' ) ) )['data']->id );
	}

	public function test_dataset_charts_forbids_a_private_dataset_and_hides_private_charts(): void {
		$this->assertForbidden( vpress_datasets_charts( new FakeRestRequest( array( 'id' => '9' ) ) ) );
		$this->assertSame( array(), $this->queries_matching( '/FROM wp_vpresscore_charts/' ) );

		vpress_datasets_charts( new FakeRestRequest( array( 'id' => '2' ) ) );
		$this->assertSame(
			array(
				"SELECT COUNT(*) AS total FROM wp_vpresscore_charts WHERE dataset_id = 2 AND permissions = 'public'",
				"SELECT * FROM wp_vpresscore_charts WHERE dataset_id = 2 AND permissions = 'public' ORDER BY updated DESC LIMIT 10",
			),
			$this->queries_matching( '/FROM wp_vpresscore_charts/' )
		);
	}

	public function test_dataset_charts_shows_everything_to_editors(): void {
		$this->as_editor();
		vpress_datasets_charts( new FakeRestRequest( array( 'id' => '9' ) ) );

		$this->assertSame(
			array(
				'SELECT COUNT(*) AS total FROM wp_vpresscore_charts WHERE dataset_id = 9',
				'SELECT * FROM wp_vpresscore_charts WHERE dataset_id = 9 ORDER BY updated DESC LIMIT 10',
			),
			$this->queries_matching( '/FROM wp_vpresscore_charts/' )
		);
	}
}
