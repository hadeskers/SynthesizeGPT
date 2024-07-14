const iconDownload =`<svg xmlns="http://www.w3.org/2000/svg" fill="none" width="24" height="24" viewBox="0 0 24 24"
                                                 stroke-width="1.5" stroke="currentColor" class="icon-md-heavy">
    <path stroke-linecap="round" stroke-linejoin="round"
          d="M9 8.25H7.5a2.25 2.25 0 0 0-2.25 2.25v9a2.25 2.25 0 0 0 2.25 2.25h9a2.25 2.25 0 0 0 2.25-2.25v-9a2.25 2.25 0 0 0-2.25-2.25H15M9 12l3 3m0 0 3-3m-3 3V2.25"/>
</svg>`;

const loadingSpinner = `<svg xmlns="http://www.w3.org/2000/svg" fill="none" width="24" height="24" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" 
    class="icon-md-heavy animate-spin">
  <path stroke-linecap="round" stroke-linejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182m0-4.991v4.99" />
</svg>
`;

function fetchAudio({message_id, text_content}, callback) {
    const accessToken = window.__NEXT_DATA__?.props?.pageProps?.session?.accessToken;
    if(!accessToken){
        callback();
        alert('Please login to download audio');
        return;
    }
    const conversation_id = window.location.pathname.split('/').find(item => item.length > 10 && item.includes('-'));
    if(!conversation_id){
        callback();
        alert('Can not detect conversation ID');
        return;
    }
    const format = 'mp3';
    const illegalChars = /[\/?<>\\:*|"]/g;
    const voice = 'ember'; // ember, cove, breeze, juniper
    const filename = (text_content || 'audio').replace(illegalChars, '-').substring(0, 40).trim() + '.' + format;
    fetch(`https://chatgpt.com/backend-api/synthesize?message_id=${message_id}&conversation_id=${conversation_id}&voice=${voice}&format=${format}`, {
        "headers": {
            "accept": "*/*",
            "authorization": `Bearer ${accessToken}`,
        },
        "body": null,
        "method": "GET"
    })
        .then(response => response.blob())
        .then(blob => {
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.style.display = 'none';
            a.href = url;
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
        })
        .catch(err => alert(err.message))
        .finally(() => {
            callback();
        })
}

window.addDownload = () => {
    const conversations = document.querySelectorAll('.agent-turn div[data-message-author-role="assistant"]:not([inserted])');

    conversations.forEach(item => {
        const parent = item.parentNode.parentNode.querySelector('div.mt-1.flex');
        if(parent){
            item.setAttribute('inserted', 'true');
            const btnDownload = document.createElement('button');
            btnDownload.setAttribute('class', 'rounded-full text-red-500 w-8 h-8 border hover:bg-token-main-surface-secondary absolute right-0 flex justify-center items-center border-red-500');
            btnDownload.innerHTML = iconDownload;
            btnDownload.onclick = () => {
                const text_content = item.innerText;
                const message_id = item.getAttribute('data-message-id');
                btnDownload.innerHTML = loadingSpinner;
                btnDownload.disabled = true;
                fetchAudio({message_id, text_content}, () => {
                    btnDownload.innerHTML = iconDownload;
                    btnDownload.disabled = false;
                });
            }
            parent.classList.add(...['justify-between', 'mb-3']);
            parent.append(btnDownload);
        }
    });
}


if(['chatgpt.com', 'chat.openai.com'].includes(window.location.hostname)){
    window.addDownload();
    setInterval(() => {
        window.addDownload();
    }, 2000);
}


