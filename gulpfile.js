const path = require('path');
const fs = require('fs');
const { task, src, dest } = require('gulp');

task('build:icons', copyIcons);

// We don't like duplicating stuff.
// Copy icons to dist folder for both nodes and credentials.
function copyIcons() {
	const iconSource = path.resolve('icons', '**', '*.{png,svg}');

	// Dynamically get all node folders
	const nodesDir = path.resolve('nodes');
	const nodeFolders = fs.readdirSync(nodesDir, { withFileTypes: true })
		.filter(dirent => dirent.isDirectory())
		.map(dirent => dirent.name);

	// Copy to each node folder
	nodeFolders.forEach(nodeFolder => {
		const nodeDestination = path.resolve('dist', 'nodes', nodeFolder);
		src(iconSource).pipe(dest(nodeDestination));
	});

	// Copy to credentials folder
	const credDestination = path.resolve('dist', 'credentials');
	return src(iconSource).pipe(dest(credDestination));
}
