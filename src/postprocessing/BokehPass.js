import { ShaderPass } from './ShaderPass.js';
import { MeshDepthMaterial } from '../materials/MeshDepthMaterial';
import { WebGLRenderTarget } from '../renderers/WebGLRenderTarget';
import { RGBADepthPacking, NoBlending, LinearFilter, RGBAFormat, AdditiveBlending, RGBFormat } from '../constants';
import { CustomShaders } from '../renderers/shaders/CustomLib';
import { UniformsUtils } from '../renderers/shaders/UniformsUtils.js';
import { Pass } from './Pass.js';
import { Vector2 } from '../math/Vector2';
import { Vector3 } from '../math/Vector3';
import { ShaderMaterial } from '../materials/ShaderMaterial';
import { OrthographicCamera } from '../cameras/OrthographicCamera';
import { Scene } from '../scenes/Scene';
import { Mesh } from '../objects/Mesh';
import { PlaneBufferGeometry } from '../geometries/PlaneGeometry';
import { Color } from '../math/Color';
import { MeshBasicMaterial } from '../materials/MeshBasicMaterial';
/**
 * Depth-of-field post-process with bokeh shader
 */


function BokehPass ( scene, camera, params ) {

	Pass.call( this );

	this.scene = scene;
	this.camera = camera;

	var focus = ( params.focus !== undefined ) ? params.focus : 1.0;
	var aspect = ( params.aspect !== undefined ) ? params.aspect : camera.aspect;
	var aperture = ( params.aperture !== undefined ) ? params.aperture : 0.025;
	var maxblur = ( params.maxblur !== undefined ) ? params.maxblur : 1.0;

	// render targets

	var width = params.width || window.innerWidth || 1;
	var height = params.height || window.innerHeight || 1;

	this.renderTargetColor = new WebGLRenderTarget( width, height, {
		minFilter: LinearFilter,
		magFilter: LinearFilter,
		format: RGBFormat
	} );
	this.renderTargetColor.texture.name = "BokehPass.color";

	this.renderTargetDepth = this.renderTargetColor.clone();
	this.renderTargetDepth.texture.name = "BokehPass.depth";

	// depth material

	this.materialDepth = new MeshDepthMaterial();
	this.materialDepth.depthPacking = RGBADepthPacking;
	this.materialDepth.blending = NoBlending;

	// bokeh material

	var bokehUniforms = UniformsUtils.clone( {

		"tColor":   { value: null },
		"tDepth":   { value: null },
		"focus":    { value: 1.0 },
		"aspect":   { value: 1.0 },
		"aperture": { value: 0.025 },
		"maxblur":  { value: 1.0 },
		"nearClip":  { value: 1.0 },
		"farClip":  { value: 1000.0 },

	} );

	bokehUniforms[ "tDepth" ].value = this.renderTargetDepth.texture;

	bokehUniforms[ "focus" ].value = focus;
	bokehUniforms[ "aspect" ].value = aspect;
	bokehUniforms[ "aperture" ].value = aperture;
	bokehUniforms[ "maxblur" ].value = maxblur;
	bokehUniforms[ "nearClip" ].value = camera.near;
	bokehUniforms[ "farClip" ].value = camera.far;

	this.materialBokeh = new ShaderMaterial( {
		defines: Object.assign( {}, {
            "DEPTH_PACKING": 1,
            "PERSPECTIVE_CAMERA": 1,
        } ),
		uniforms: bokehUniforms,
		vertexShader: CustomShaders.bokeh_vert,
		fragmentShader: CustomShaders.bokeh_frag
	} );

	this.uniforms = bokehUniforms;
	this.needsSwap = false;

	this.camera2 = new OrthographicCamera( - 1, 1, 1, - 1, 0, 1 );
	this.scene2  = new Scene();

	this.quad2 = new Mesh( new PlaneBufferGeometry( 2, 2 ), null );
	this.quad2.frustumCulled = false; // Avoid getting clipped
	this.scene2.add( this.quad2 );

	this.oldClearColor = new Color();
	this.oldClearAlpha = 1;

};

BokehPass.prototype = Object.assign( Object.create( Pass.prototype ), {

	constructor: BokehPass,

	render: function ( renderer, writeBuffer, readBuffer, delta, maskActive ) {

		this.quad2.material = this.materialBokeh;

		// Render depth into texture

		this.scene.overrideMaterial = this.materialDepth;

		this.oldClearColor.copy( renderer.getClearColor() );
		this.oldClearAlpha = renderer.getClearAlpha();
		var oldAutoClear = renderer.autoClear;
		renderer.autoClear = false;

		renderer.setClearColor( 0xffffff );
		renderer.setClearAlpha( 1.0 );
		renderer.render( this.scene, this.camera, this.renderTargetDepth, true );

		// Render bokeh composite

		this.uniforms[ "tColor" ].value = readBuffer.texture;
		this.uniforms[ "nearClip" ].value = this.camera.near;
		this.uniforms[ "farClip" ].value = this.camera.far;

		if ( this.renderToScreen ) {

			renderer.render( this.scene2, this.camera2 );

		} else {

			renderer.render( this.scene2, this.camera2, writeBuffer, this.clear );

		}

		this.scene.overrideMaterial = null;
		renderer.setClearColor( this.oldClearColor );
		renderer.setClearAlpha( this.oldClearAlpha );
		renderer.autoClear = this.oldAutoClear;
	
	}

} );

export { BokehPass };