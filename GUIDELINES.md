# Implementation Guidelines

For each resource implementation:

1. **Create API Interface File:**
   - Location: `nodes/Air/api/{resource}/{resource}.ts`
	 - {apiPrefix} variable in postman.json is `api/public`
   - Define TypeScript interfaces for requests/responses
   - Implement API service methods
   - Follow existing pattern from `triagerules.ts`
	 - Use `helpers.ts` for generic methods

2. **Create Resource File:**
   - Location: `nodes/Air/resources/{resource}.ts`
   - Define n8n node operations and properties
   - Implement execute functions
   - Follow existing pattern from `triagerules.ts`
	 - Alphabetize all `Additional Fields` properties by `displayName` to be conformant with the linter

3. **Update Main Node File:**
   - Add import statements to `Air.node.ts`
   - Add resource option to the main properties array
	 - Start all filter parameters inside 'Additional Fields' with 'Filter By'. See `triagerules.ts` resource implementation for examples
   - Add operations to the properties spread
   - Add load options and list search methods
   - Add case to the execute switch statement

4. **Update Documentation:**
   - Add new resource to README.md
   - Follow existing documentation format
   - Do not add "Recent Updates" section
   - Update Table of Contents
	 - Mark the completed tasks in TODO.md as `completed`

5. **Key Requirements:**
   - Use `_id` as Entity Identifier property name
   - Ensure code builds after implementation
	 - Ensure there are no linter errors after the implementation
   - Check for similar implementations to avoid duplication
   - Keep code simple and clean
   - Follow existing patterns and conventions
	 - After completing the implementation, add the resource to `Air.node.ts` options so that it becomes visible as a resource alongside other resources such as 'Acquisition', 'Asset', and etc
