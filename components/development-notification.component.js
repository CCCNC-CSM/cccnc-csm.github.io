if (!window.location.href.startsWith('https://www.csm.cccnc.org')) {
    document.addEventListener("DOMContentLoaded", function() {
        const div = document.createElement('div');
        div.id="development_notification";
        div.innerHTML='<span style="color:red;background-color:white;">DEVELOPMENT Site for the Offical Site: &nbsp;<a href="https://www.csm.cccnc.org">https://www.csm.cccnc.org</a></span>';
        div.style.backgroundColor="white";
        div.style.width="100%";
        div.style.textAlign = 'center';
        div.style.position = 'absolute';
        div.style.zIndex = '99999';
        document.body.insertBefore(div, document.body.firstChild);
    });
}