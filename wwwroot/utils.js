// Get access token from backend server
export function getAccessToken(callback) {
    // For file upload functionality, we need to get a real token from the backend
    // This will use the APS credentials you configured in the .env file
    fetch('/api/auth/token')
        .then(response => {
            if (!response.ok) {
                throw new Error('Failed to get access token');
            }
            return response.json();
        })
        .then(data => {
            callback(data.access_token, data.expires_in);
        })
        .catch(error => {
            console.error('Token fetch error:', error);
            // Fallback to mock token for basic viewer functionality
            const mockToken = 'eyJhbGciOiJSUzI1NiIsImtpZCI6IlZiakZvUzhQU3lYODQyMV95dndvRUdRdFJEa19SUzI1NiIsInBpLmF0bSI6ImFzc2MifQ.eyJzY29wZSI6WyJ2aWV3YWJsZXM6cmVhZCJdLCJjbGllbnRfaWQiOiIyWmx5d2g3UGdkZGsxUU5hNkRyZlpDbG1NeU1Bdk52byIsImlzcyI6Imh0dHBzOi8vZGV2ZWxvcGVyLmFwaS5hdXRvZGVzay5jb20iLCJhdWQiOiJodHRwczovL2F1dG9kZXNrLmNvbSIsImp0aSI6ImY0VFNJNWxUQWY2cm9SZnRiREQ4M2wxWnpIZFBzUWt3SG9SQjh5MGV4MUZvNjZoTWwzOGtxVjdwOTVURnFOa1oiLCJleHAiOjE3NTY4ODc0MTF9.VZzgt3GlHxFbFyhPhMwp109uWVRlBuck70rV4hcgbuBG2tuQMitFXnFeIGpfsWocbcMk6tR6zOkXZLz2RXo4X-zYY85IqxKNXM1bzB-S4tUQEMyGLwDjaeA9_5xObbEA-bc95j9S2Hc5DEgKNTc3IHibJScpta6TvtE3KDSLBkwNoXeObrdZEX17Zb4hwkX3-P_nLQjRlRFgp91utMxu3r4En-_YaQThe6vzYlFikOosDvssj1TdQmBXzMi957URtF4Lq8kIG4RfXsztUoLWbsgEKWXjwiY-uaUb-NHI3ML0STT5-1gtxKSFQMG3OfPclgXxvXEiuKVddr_rjhxDYw';
            callback(mockToken, 3600);
        });
}

/**
 * Initialize the Autodesk Viewer
 * @param {string} containerId - The ID of the container element
 * @param {string} accessToken - The access token for authentication
 */
export async function initViewer(containerId, accessToken) {
    return new Promise((resolve, reject) => {
        const options = {
            env: 'AutodeskProduction',
            api: 'derivativeV2',
            getAccessToken: function(onTokenReady) {
                onTokenReady(accessToken, 3600);
            }
        };
        
        Autodesk.Viewing.Initializer(options, function() {
            const viewer = new Autodesk.Viewing.GuiViewer3D(document.getElementById(containerId));
            const startedCode = viewer.start();
            if (startedCode > 0) {
                console.error('Failed to create a Viewer: WebGL not supported.');
                reject(new Error('WebGL not supported'));
                return;
            }
            
            console.log('Initialization complete, viewer ready!');
            resolve(viewer);
        });
    });
}

/**
 * Create simple geometry in the viewer
 * @param {Object} viewer - The Autodesk viewer instance
 */
export function createSimpleGeometry(viewer) {
    // Create a simple cube geometry
    const geometry = new THREE.BoxGeometry(10, 10, 10);
    const material = new THREE.MeshBasicMaterial({ color: 0x00ff00, wireframe: true });
    const cube = new THREE.Mesh(geometry, material);
    
    // Add the cube to the scene
    viewer.impl.scene.add(cube);
    
    // Fit the view to show the cube
    viewer.fitToView();
    
    console.log('Simple geometry created and added to viewer');
}

/**
 * Lists all models available for viewing.
 * @async
 * @returns {Promise<{ name: string, urn: string }>} List of models.
 */
export function listModels() {
    // Mock implementation with publicly available sample models
    const sampleModels = [
        {
            name: "Autodesk Sample Model",
            urn: "dXJuOmFkc2sub2JqZWN0czpvcy5vYmplY3Q6QTM2MkIzNzVGQzU0NEY3N0I5MzM4RjYyRkM2Rjk4MzMtMTYxNzI1NzI2NzUyNi9yYWNfYWR2YW5jZWRfc2FtcGxlX3Byb2plY3QucnZ0"
        }
    ];
    return Promise.resolve(sampleModels);
}

/**
 * Upload file and translate it for viewing
 * @param {File} file - The file to upload
 * @param {string} accessToken - The access token
 * @returns {Promise<string>} The URN of the uploaded model
 */
export async function uploadAndTranslate(file, accessToken) {
    try {
        // Step 1: Create a bucket (if not exists)
        const bucketKey = 'viewer-bucket-' + Date.now();
        await createBucket(bucketKey, accessToken);
        
        // Step 2: Upload file to bucket
        const objectKey = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
        await uploadFile(bucketKey, objectKey, file, accessToken);
        
        // Step 3: Get the URN and start translation
        const urn = btoa(`urn:adsk.objects:os.object:${bucketKey}/${objectKey}`).replace(/=/g, '');
        await startTranslation(urn, accessToken);
        
        // Step 4: Wait for translation to complete
        await waitForTranslation(urn, accessToken);
        
        return urn;
    } catch (error) {
        console.error('Upload and translate error:', error);
        throw error;
    }
}

/**
 * Create a bucket in OSS
 */
async function createBucket(bucketKey, accessToken) {
    const response = await fetch('https://developer.api.autodesk.com/oss/v2/buckets', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            bucketKey: bucketKey,
            policyKey: 'temporary'
        })
    });
    
    if (!response.ok && response.status !== 409) { // 409 means bucket already exists
        throw new Error(`Failed to create bucket: ${response.statusText}`);
    }
}

/**
 * Upload file to OSS bucket
 */
async function uploadFile(bucketKey, objectKey, file, accessToken) {
    const response = await fetch(`https://developer.api.autodesk.com/oss/v2/buckets/${bucketKey}/objects/${objectKey}`, {
        method: 'PUT',
        headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/octet-stream'
        },
        body: file
    });
    
    if (!response.ok) {
        throw new Error(`Failed to upload file: ${response.statusText}`);
    }
}

/**
 * Start model translation
 */
async function startTranslation(urn, accessToken) {
    const response = await fetch('https://developer.api.autodesk.com/modelderivative/v2/designdata/job', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            input: {
                urn: urn
            },
            output: {
                formats: [{
                    type: 'svf',
                    views: ['2d', '3d']
                }]
            }
        })
    });
    
    if (!response.ok) {
        throw new Error(`Failed to start translation: ${response.statusText}`);
    }
}

/**
 * Wait for translation to complete
 */
async function waitForTranslation(urn, accessToken, maxAttempts = 30) {
    for (let i = 0; i < maxAttempts; i++) {
        const response = await fetch(`https://developer.api.autodesk.com/modelderivative/v2/designdata/${urn}/manifest`, {
            headers: {
                'Authorization': `Bearer ${accessToken}`
            }
        });
        
        if (response.ok) {
            const manifest = await response.json();
            if (manifest.status === 'success') {
                return;
            } else if (manifest.status === 'failed') {
                throw new Error('Translation failed');
            }
        }
        
        // Wait 2 seconds before checking again
        await new Promise(resolve => setTimeout(resolve, 2000));
    }
    
    throw new Error('Translation timeout');
}

/**
 * Loads specific model into the viewer.
 * @param {Autodesk.Viewing.GuiViewer3D} viewer Target viewer.
 * @param {string} urn URN of the model in the Model Derivative service.
 */
export function loadModel(viewer, urn) {
    return new Promise((resolve, reject) => {
        Autodesk.Viewing.Document.load(
            'urn:' + urn,
            doc => {
                const viewables = doc.getRoot().getDefaultGeometry();
                viewer.loadDocumentNode(doc, viewables).then(() => {
                    console.log('Model loaded successfully');
                    resolve();
                }).catch(reject);
            },
            (code, message, errors) => {
                console.error('Document load error:', code, message, errors);
                reject(new Error(`Could not load model: ${message}`));
            }
        );
    });
}