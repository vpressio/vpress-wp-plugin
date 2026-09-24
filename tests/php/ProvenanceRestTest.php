<?php

use PHPUnit\Framework\TestCase;

/**
 * Provenance fields on /dataset/update, /dataset/get and /dataset/list.
 */
final class ProvenanceRestTest extends TestCase {

	private FakeWpdb $wpdb;

	protected function setUp(): void {
		$this->wpdb                  = new FakeWpdb();
		$GLOBALS['wpdb']             = $this->wpdb;
		$GLOBALS['vpress_test_caps'] = array( 'edit_posts' );
	}

	protected function tearDown(): void {
		$GLOBALS['vpress_test_caps'] = array();
	}

	private function update( array $params ) {
		return vpress_update_dataset( new FakeRestRequest( array_merge( array( 'id' => '3', 'name' => 'Presupuesto' ), $params ) ) );
	}

	/** The data array of the single update() write. */
	private function written(): array {
		$updates = array_values( array_filter( $this->wpdb->writes, static fn( $w ) => 'update' === $w[0] ) );
		$this->assertCount( 1, $updates );
		return $updates[0][2];
	}

	public function test_update_stores_the_four_provenance_fields_sanitised(): void {
		$this->update(
			array(
				'source_name'  => '<script>alert(1)</script>Secretaría de Hacienda',
				'license'      => ' CC-BY-4.0 ',
				'retrieved_at' => '2026-09-01',
				'source_notes' => "Cifras preliminares.\n<b>Sin</b> ajustar.",
			)
		);

		$data = $this->written();
		$this->assertSame( 'Secretaría de Hacienda', $data['source_name'] );
		$this->assertSame( 'CC-BY-4.0', $data['license'] );
		$this->assertSame( '2026-09-01', $data['retrieved_at'] );
		$this->assertSame( "Cifras preliminares.\nSin ajustar.", $data['source_notes'], 'notes keep their line breaks' );
	}

	public function test_update_rejects_an_impossible_retrieved_at_and_writes_nothing(): void {
		foreach ( array( '2026-13-40', '2026-02-30', '24/09/2026', '2026-9-1', '2026-09-01 10:00:00' ) as $bad ) {
			$this->wpdb->writes = array();
			$result = $this->update( array( 'retrieved_at' => $bad ) );

			$this->assertInstanceOf( WP_Error::class, $result, $bad );
			$this->assertSame( 'vpress_bad_date', $result->get_error_code() );
			$this->assertSame( 400, $result->get_error_data()['status'] );
			$this->assertSame( array(), $this->wpdb->writes, "$bad must not be written" );
		}
	}

	public function test_empty_strings_clear_the_fields_and_absent_fields_are_left_alone(): void {
		$this->update( array( 'source_name' => '', 'retrieved_at' => '' ) );

		$data = $this->written();
		$this->assertArrayHasKey( 'source_name', $data );
		$this->assertNull( $data['source_name'] );
		$this->assertNull( $data['retrieved_at'] );
		$this->assertArrayNotHasKey( 'license', $data, 'a field the client did not send is not overwritten' );
		$this->assertArrayNotHasKey( 'source_notes', $data );
		$this->assertArrayNotHasKey( 'source_url', $data );
	}

	public function test_licence_is_capped_to_the_column_width(): void {
		$this->update( array( 'license' => str_repeat( 'x', 80 ) ) );

		$this->assertSame( 64, mb_strlen( $this->written()['license'] ) );
	}

	public function test_source_url_is_url_sanitised_for_uploaded_datasets(): void {
		$this->wpdb->on( '/SELECT source_type FROM wp_vpresscore_datasets WHERE id = 3$/', 'upload' );

		$this->update( array( 'source_url' => 'https://datos.gob.mx/presupuesto.csv' ) );
		$this->assertSame( 'https://datos.gob.mx/presupuesto.csv', $this->written()['source_url'] );

		$this->wpdb->writes = array();
		$this->update( array( 'source_url' => 'javascript:alert(1)' ) );
		$this->assertNull( $this->written()['source_url'], 'a non-http(s) URL is dropped' );
	}

	public function test_source_url_of_a_live_source_is_not_editable_here(): void {
		$this->wpdb->on( '/SELECT source_type FROM wp_vpresscore_datasets WHERE id = 3$/', 'gsheet' );

		$this->update( array( 'source_url' => 'https://evil.example/other.csv', 'source_name' => 'INEGI' ) );

		$data = $this->written();
		$this->assertArrayNotHasKey( 'source_url', $data, 'the refresh URL is owned by /dataset/from-url' );
		$this->assertSame( 'INEGI', $data['source_name'] );
	}

	public function test_a_provenance_only_payload_leaves_the_other_columns_alone(): void {
		$result = vpress_update_dataset( new FakeRestRequest( array( 'id' => '3', 'source_name' => 'INEGI' ) ) );

		$this->assertNotInstanceOf( WP_Error::class, $result );
		$data = $this->written();
		$this->assertSame( array( 'source_name' ), array_keys( $data ), 'the title, description, tags and owner are untouched' );
	}

	public function test_a_title_only_payload_does_not_clear_the_provenance(): void {
		vpress_update_dataset( new FakeRestRequest( array( 'id' => '3', 'name' => 'Presupuesto' ) ) );

		$this->assertSame( array( 'name' ), array_keys( $this->written() ) );
	}

	public function test_a_payload_with_nothing_to_write_writes_nothing(): void {
		$result = vpress_update_dataset( new FakeRestRequest( array( 'id' => '3' ) ) );

		$this->assertSame( array(), $this->wpdb->writes );
		$this->assertSame( 0, $result['data'] );
	}

	public function test_the_write_formats_line_up_with_their_columns(): void {
		vpress_update_dataset(
			new FakeRestRequest(
				array( 'id' => '3', 'name' => 'P', 'owner_id' => '9', 'source_name' => 'INEGI', 'license' => 'CC0-1.0' )
			)
		);

		$updates = array_values( array_filter( $this->wpdb->writes, static fn( $w ) => 'update' === $w[0] ) );
		$this->assertSame( array( 'name', 'owner_id', 'source_name', 'license' ), array_keys( $updates[0][2] ) );
		$this->assertSame( 9, $updates[0][2]['owner_id'], 'the owner is written as an int' );
	}

	public function test_get_and_list_return_the_provenance_fields_to_anonymous_callers(): void {
		$GLOBALS['vpress_test_caps'] = array();
		$row = static fn() => (object) array(
			'id'                 => '3',
			'permissions'        => 'public',
			'source_url'         => 'https://datos.gob.mx/p.csv',
			'source_name'        => 'SHCP',
			'license'            => 'CC-BY-4.0',
			'retrieved_at'       => '2026-09-01',
			'source_notes'       => 'Notas',
			'last_refresh_error' => 'secret',
		);
		$this->wpdb->on( '/FROM wp_vpresscore_datasets WHERE id = 3$/', $row() );
		$this->wpdb->on( '/d\.\*/', array( $row() ) );

		$got    = vpress_get_dataset( new FakeRestRequest( array( 'id' => '3' ) ) )['data'];
		$listed = vpress_list_datasets( new FakeRestRequest( array( 'page' => '1', 'perPage' => '6' ) ) )['data'][0];

		foreach ( array( $got, $listed ) as $dataset ) {
			$this->assertSame( 'SHCP', $dataset->source_name );
			$this->assertSame( 'CC-BY-4.0', $dataset->license );
			$this->assertSame( '2026-09-01', $dataset->retrieved_at );
			$this->assertSame( 'Notas', $dataset->source_notes );
			$this->assertObjectNotHasProperty( 'last_refresh_error', $dataset );
		}
	}
}
