const iconDownload = `<svg xmlns="http://www.w3.org/2000/svg" fill="none" width="24" height="24" viewBox="0 0 24 24"
                                                 stroke-width="1.5" stroke="currentColor" class="icon-md-heavy">
    <path stroke-linecap="round" stroke-linejoin="round"
          d="M9 8.25H7.5a2.25 2.25 0 0 0-2.25 2.25v9a2.25 2.25 0 0 0 2.25 2.25h9a2.25 2.25 0 0 0 2.25-2.25v-9a2.25 2.25 0 0 0-2.25-2.25H15M9 12l3 3m0 0 3-3m-3 3V2.25"/>
</svg>`;

const loadingSpinner = `<svg xmlns="http://www.w3.org/2000/svg" fill="none" width="24" height="24" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" 
    class="icon-md-heavy animate-spin">
  <path stroke-linecap="round" stroke-linejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182m0-4.991v4.99" />
</svg>
`;

function downloadBlob(blob, filename) {
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.style.display = 'none';
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
}

function isValidJWT(token) {
    if (!token) {
        return false;
    }
    const jwtRegex = /^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/;
    return jwtRegex.test(token);
}

function getAccessToken() {
    const accessToken =  window.__NEXT_DATA__?.props?.pageProps?.session?.accessToken
        || window.__remixContext?.state?.loaderData?.root?.clientBootstrap?.session?.accessToken
        || window.__reactRouterContext?.state?.loaderData?.root?.clientBootstrap?.session?.accessToken
        || document.body.innerHTML.split('accessToken\\",\\"').pop().split('\\"').shift();
    return isValidJWT(accessToken) && accessToken;
}

var _globalVoices = null;
async function fetchVoices() {
    const accessToken = getAccessToken();
    if (!accessToken) {
        console.error('No access token');
        return;
    }
    return fetch('https://chatgpt.com/backend-api/settings/voices', {
        "headers": {
            "accept": "*/*",
            "authorization": `Bearer ${accessToken}`,
        },
        "body": null,
        "method": "GET"
    })
        .then(response => response.json())
        .then(data => {
            _globalVoices = data['voices'];
            return _globalVoices;
        })
        .catch(err => console.error('Error load voices from server', err));
}

const _audioCached = {};
function fetchAudio({message_id, text_content, selected_voice}, callback) {
    const conversation_id = window.location.pathname.split('/').find(item => item.length > 10 && item.includes('-'));
    if (!conversation_id) {
        callback();
        alert('Can not detect conversation ID');
        return;
    }

    selected_voice = selected_voice || 'ember';

    const cacheKey = `${conversation_id}_${message_id}_${selected_voice}`;
    if (_audioCached[cacheKey] && _audioCached[cacheKey].filename) {
        const {blob, filename} = _audioCached[cacheKey];
        downloadBlob(blob, filename);
        callback();
        return;
    }
    const accessToken = getAccessToken();
    if (!accessToken) {
        callback();
        alert('Please login to download audio');
        return;
    }
    const format = 'mp3';
    const illegalChars = /[\/?<>\\:*|"]/g;
    const filename = (text_content || 'audio').replace(illegalChars, '-').substring(0, 40).trim() + '.' + format;
    fetch(`https://chatgpt.com/backend-api/synthesize?message_id=${message_id}&conversation_id=${conversation_id}&voice=${selected_voice}&format=${format}`, {
        "headers": {
            "accept": "*/*",
            "authorization": `Bearer ${accessToken}`,
        },
        "body": null,
        "method": "GET"
    })
        .then(response => response.blob())
        .then(blob => {
            _audioCached[cacheKey] = {blob, filename};
            downloadBlob(blob, filename);
        })
        .catch(err => alert(err.message))
        .finally(() => {
            callback();
        })
}

window.addDownload = () => {
    const conversations = document.querySelectorAll('.agent-turn div[data-message-author-role="assistant"]:not([inserted])');
    conversations.forEach(item => {
        const articleElement = item.closest('article[data-testid^="conversation-turn"]');
        if(!articleElement) {
            return;
        }
        const btnPlay = articleElement.querySelector('button[data-testid="voice-play-turn-action-button"]');
        if(!btnPlay) {
            return;
        }
        item.setAttribute('inserted', 'true');
        const parent = btnPlay.parentNode.parentNode;
        const btnDownload = document.createElement('button');
        btnDownload.setAttribute('class', 'rounded-full text-green-500 w-8 h-8 border hover:bg-token-main-surface-secondary ml-3 flex justify-center items-center border-green-500');
        btnDownload.innerHTML = iconDownload;
        btnDownload.onclick = () => {
            const text_content = item.innerText;
            const message_id = item.getAttribute('data-message-id');
            btnDownload.innerHTML = loadingSpinner;
            btnDownload.disabled = true;
            const selected_voice = btnDownload.getAttribute('selected-voice');
            fetchAudio({message_id, text_content, selected_voice}, () => {
                btnDownload.innerHTML = iconDownload;
                btnDownload.disabled = false;
            });
        }
        parent.classList.add(...['justify-between', 'mb-3']);
        const span = document.createElement('span');
        span.setAttribute('class', 'flex gap-2');
        span.append(btnDownload);

        if(_globalVoices && _globalVoices.length) {
            btnDownload.setAttribute('selected-voice', _globalVoices[0].voice);

            const selectBox = document.createElement('select');
            selectBox.onchange = () => {
                btnDownload.setAttribute('selected-voice', selectBox.value);
            }
            selectBox.setAttribute('title', 'Select voice to download');
            selectBox.setAttribute('class', 'py-0 bg-gray-50 border border-gray-300 h-8 text-gray-900 rounded-lg focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500');

            _globalVoices.forEach(item => {
                const option = document.createElement('option');
                option.setAttribute('value', item.voice);
                option.textContent = item.name + ' - ' + item.description;
                selectBox.append(option);
            });
            span.append(selectBox);
        }
        parent.append(span);
    });
}

console.log('Synthesize: Load inject.js');
if (['chatgpt.com', 'chat.openai.com'].includes(window.location.hostname)) {
    fetchVoices()
        .then(isSuccess => {
            if (isSuccess) {
                window.addDownload();
                setInterval(() => {
                    window.addDownload();
                }, 2000);
            }
        });
}
