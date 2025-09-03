import { initViewer, loadModel } from './viewer.js';

initViewer(document.getElementById('preview')).then(viewer => {
    const urn = window.location.hash?.substring(1);
    setupModelSelection(viewer, urn);
    setupModelUpload(viewer);
});

async function setupModelSelection(viewer, selectedUrn) {
    const dropdown = document.getElementById('models');
    dropdown.innerHTML = '';
    try {
        const resp = await fetch('/api/models');
        if (!resp.ok) {
            throw new Error(await resp.text());
        }
        const models = await resp.json();
        dropdown.innerHTML = models.map(model => `<option value=${model.urn} ${model.urn === selectedUrn ? 'selected' : ''}>${model.name}</option>`).join('\n');
        dropdown.onchange = () => onModelSelected(viewer, dropdown.value);
        if (dropdown.value) {
            onModelSelected(viewer, dropdown.value);
        }
    } catch (err) {
        alert('Could not list models. See the console for more details.');
        console.error(err);
    }
}

async function setupModelUpload(viewer) {
    const upload = document.getElementById('upload');
    const input = document.getElementById('input');
    const models = document.getElementById('models');
    
    upload.onclick = () => input.click();
    
    input.onchange = async () => {
        const file = input.files[0];
        if (!file) return;
        
        // Validate file size (100MB limit)
        const maxSize = 100 * 1024 * 1024;
        if (file.size > maxSize) {
            showNotification(`<div class="status-error">❌ File too large</div><p>File size: ${formatFileSize(file.size)}<br>Maximum allowed: ${formatFileSize(maxSize)}</p>`);
            input.value = '';
            return;
        }
        
        // Validate file type
        const allowedExtensions = ['.rvt', '.dwg', '.ifc', '.nwd', '.3ds', '.fbx', '.obj', '.step', '.iges', '.zip'];
        const fileExtension = file.name.toLowerCase().substring(file.name.lastIndexOf('.'));
        
        if (!allowedExtensions.includes(fileExtension)) {
            showNotification(`<div class="status-error">❌ Unsupported file type</div><p>File type: <strong>${fileExtension}</strong><br>Supported types: ${allowedExtensions.join(', ')}</p>`);
            input.value = '';
            return;
        }
        
        let data = new FormData();
        data.append('model-file', file);
        
        // Handle ZIP files
        if (file.name.endsWith('.zip')) {
            const entrypoint = window.prompt('Please enter the filename of the main design inside the archive (e.g., model.rvt):');
            if (!entrypoint) {
                input.value = '';
                return;
            }
            data.append('model-zip-entrypoint', entrypoint);
        }
        
        // Disable controls during upload
        setControlsEnabled(false);
        
        showNotification(`
            <div class="status-info">
                <div class="spinner"></div>
                Uploading model
            </div>
            <p><strong>${file.name}</strong> (${formatFileSize(file.size)})</p>
            <div class="progress-bar">
                <div class="progress-bar-fill" style="width: 0%"></div>
            </div>
            <p><small>Please do not reload the page during upload.</small></p>
        `);
        
        try {
            const resp = await fetch('/api/models', { 
                method: 'POST', 
                body: data
            });
            
            if (!resp.ok) {
                const errorData = await resp.json().catch(async () => ({ error: { message: await resp.text() } }));
                throw new Error(errorData.error?.message || 'Upload failed');
            }
            
            const model = await resp.json();
            
            showNotification(`
                <div class="status-success">✅ Upload successful!</div>
                <p><strong>${file.name}</strong> has been uploaded and translation started.</p>
                <p><small>The model will appear in the dropdown once translation is complete.</small></p>
            `);
            
            // Refresh model list and select the new model
            setTimeout(() => {
                setupModelSelection(viewer, model.urn);
                clearNotification();
            }, 2000);
            
        } catch (err) {
            console.error('Upload error:', err);
            showNotification(`
                <div class="status-error">❌ Upload failed</div>
                <p><strong>Error:</strong> ${err.message}</p>
                <p><small>Please check the console for more details and try again.</small></p>
            `);
            
            setTimeout(clearNotification, 5000);
        } finally {
            setControlsEnabled(true);
            input.value = '';
        }
    };
}

async function onModelSelected(viewer, urn) {
    if (window.onModelSelectedTimeout) {
        clearTimeout(window.onModelSelectedTimeout);
        delete window.onModelSelectedTimeout;
    }
    
    if (!urn) return;
    
    window.location.hash = urn;
    
    try {
        const resp = await fetch(`/api/models/${urn}/status`);
        if (!resp.ok) {
            const errorData = await resp.json().catch(async () => ({ error: { message: await resp.text() } }));
            throw new Error(errorData.error?.message || 'Failed to get model status');
        }
        
        const status = await resp.json();
        
        switch (status.status) {
            case 'n/a':
                showNotification(`
                    <div class="status-warning">⚠️ Model not translated</div>
                    <p>This model has not been processed yet. Translation may be required.</p>
                `);
                break;
                
            case 'inprogress':
                const progress = status.progress || 'Processing...';
                const progressPercent = extractProgressPercent(progress);
                
                showNotification(`
                    <div class="status-info">
                        <div class="spinner"></div>
                        Translating model
                    </div>
                    <p><strong>Progress:</strong> ${progress}</p>
                    ${progressPercent !== null ? `
                        <div class="progress-bar">
                            <div class="progress-bar-fill" style="width: ${progressPercent}%"></div>
                        </div>
                    ` : ''}
                    <p><small>This may take several minutes depending on model complexity.</small></p>
                `);
                
                window.onModelSelectedTimeout = setTimeout(onModelSelected, 5000, viewer, urn);
                break;
                
            case 'failed':
                const errorMessages = status.messages && status.messages.length > 0 
                    ? status.messages.map(msg => `<li>${typeof msg === 'string' ? msg : JSON.stringify(msg)}</li>`).join('')
                    : '<li>No specific error details available</li>';
                    
                showNotification(`
                    <div class="status-error">❌ Translation failed</div>
                    <p>The model could not be processed. Please check the following issues:</p>
                    <ul>${errorMessages}</ul>
                    <p><small>Try uploading a different file or contact support if the problem persists.</small></p>
                `);
                break;
                
            case 'success':
            default:
                showNotification(`
                    <div class="status-info">
                        <div class="spinner"></div>
                        Loading model...
                    </div>
                `);
                
                try {
                    await loadModel(viewer, urn);
                    clearNotification();
                } catch (loadErr) {
                    console.error('Model loading error:', loadErr);
                    showNotification(`
                        <div class="status-error">❌ Failed to load model</div>
                        <p><strong>Error:</strong> ${loadErr.message}</p>
                        <p><small>The model was translated successfully but could not be displayed.</small></p>
                    `);
                }
                break;
        }
    } catch (err) {
        console.error('Model selection error:', err);
        showNotification(`
            <div class="status-error">❌ Error loading model</div>
            <p><strong>Error:</strong> ${err.message}</p>
            <p><small>Please try again or select a different model.</small></p>
        `);
    }
}

function showNotification(message) {
    const overlay = document.getElementById('overlay');
    overlay.innerHTML = `<div class="notification">${message}</div>`;
    overlay.style.display = 'flex';
}

function clearNotification() {
    const overlay = document.getElementById('overlay');
    overlay.innerHTML = '';
    overlay.style.display = 'none';
}

function setControlsEnabled(enabled) {
    const upload = document.getElementById('upload');
    const models = document.getElementById('models');
    
    if (enabled) {
        upload.removeAttribute('disabled');
        models.removeAttribute('disabled');
        upload.textContent = 'Upload';
    } else {
        upload.setAttribute('disabled', 'true');
        models.setAttribute('disabled', 'true');
        upload.textContent = 'Uploading...';
    }
}

function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function extractProgressPercent(progressText) {
    if (!progressText) return null;
    const match = progressText.match(/(\d+)%/);
    return match ? parseInt(match[1]) : null;
}
