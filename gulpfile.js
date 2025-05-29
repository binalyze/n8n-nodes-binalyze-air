const path = require('path');
const { task, src, dest } = require('gulp');

task('build:icons', copyIcons);

// We don't like duplicating stuff.
// Copy icons to dist folder for both nodes and credentials.
function copyIcons() {
	const nodeSource = path.resolve('icons', '**', '*.{png,svg}');
	const nodeDestination = path.resolve('dist', 'nodes');

	src(nodeSource).pipe(dest(nodeDestination));

	const credSource = path.resolve('icons', '**', '*.{png,svg}');
	const credDestination = path.resolve('dist', 'credentials');

	return src(credSource).pipe(dest(credDestination));
}
