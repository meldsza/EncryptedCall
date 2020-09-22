const { RTCPeerConnection, RTCSessionDescription } = window;

const socket = io.connect("https://encrypted-call-meldsza.herokuapp.com/");
Vue.use(Toasted)
let localStream;
var app = new Vue({
    el: '#app',
    data: {
        status: 'idle',
        ready: false,
        peerConnection: new RTCPeerConnection({
            iceServers: [{
                urls: [
                    "stun:stun.l.google.com:19302",
                    "stun:stun1.l.google.com:19302",
                    "stun:stun2.l.google.com:19302",
                    "stun:stun3.l.google.com:19302",
                    "stun:stun4.l.google.com:19302",
                    "stun:stun.ekiga.net",
                    "stun:stun.ideasip.com",
                    "stun:stun.rixtelecom.se",
                    "stun:stun.schlund.de",
                    "stun:stun.stunprotocol.org:3478",
                    "stun:stun.voiparound.com",
                    "stun:stun.voipbuster.com",
                    "stun:stun.voipstunt.com",
                    "stun:stun.voxgratia.org"
                ]
            }]
        }),
        uuid: '',
        audio: true,
        video: true,
        toCallID: '',
        peerSocket: '',
        candidates: [],
        callingOffer: {},
    },
    mounted() {
        this.setupVideo()
        socket.on("call-made", this.handleCallMade);
        socket.on("call-answered", this.handleCallAnswered);
        socket.on("call-invalid", this.handleInvalid);
        socket.on("call-rejected", this.handleRejected);
        socket.on("set-id", this.handleSetID);
        socket.on("ice", this.handleIce);
        socket.on("conversion-made", this.handleConversion);
    },
    methods: {
        setupVideo() {
            this.peerConnection.ontrack = function ({ streams: [stream] }) {
                const remoteVideo = document.getElementById("remote-video");
                if (remoteVideo) {
                    remoteVideo.srcObject = stream;
                }
            };
            this.peerConnection.onicecandidate = (e) => {
                this.candidates.push(e.candidate)

            }
            navigator.mediaDevices.getUserMedia({ audio: true, video: true }).then(stream => {
                localStream = stream
                const localVideo = document.getElementById("local-video");
                if (localVideo) {
                    localVideo.srcObject = stream;
                }
                stream.getTracks().forEach(track => this.peerConnection.addTrack(track, stream));
            }).catch(a => {
                this.ready = false;
                this.$toasted.show('Unable to get local video. Please fix device and refresh')
            });
        },
        async handleCallMade(data) {
            this.status = 'called'
            this.callingOffer = data
        },
        async handleSetID(data) {
            this.uuid = data.code;
            this.ready = true;

        },
        async handleIce(data) {
            console.log("Adding Ice", data.candidate)
            this.peerConnection.addIceCandidate(data.candidate)
        },
        async confirmCall() {

            await this.peerConnection.setRemoteDescription(
                new RTCSessionDescription(this.callingOffer.offer)
            );
            const answer = await this.peerConnection.createAnswer();
            await this.peerConnection.setLocalDescription(new RTCSessionDescription(answer));
            this.peerSocket = this.callingOffer.socket;
            socket.emit("call-answer", {
                answer,
                to: this.callingOffer.socket
            });
            this.sendIce();
            this.status = 'connected'
        },
        async handleConversion(data) {
            const offer = await this.peerConnection.createOffer();
            await this.peerConnection.setLocalDescription(new RTCSessionDescription(offer));

            this.peerSocket = data.socket
            socket.emit("call-user", {
                offer,
                to: this.peerSocket
            });
        },
        async sendIce() {
            while (this.candidates.length > 0) {
                let candidate = this.candidates.shift();
                console.log("Preparing to send Ice", candidate, this.peerSocket)
                if (candidate && this.peerSocket) {
                    console.log("Sending Ice", candidate)
                    socket.emit('send-ice', {
                        to: this.peerSocket,
                        candidate: candidate
                    })
                }
            }
        },
        async callUser() {
            socket.emit("call-convert", {
                uuid: this.toCallID
            });
            this.status = 'calling';
        },
        async handleCallAnswered(data) {
            this.peerSocket = data.socket;
            console.log("Set Peer")
            await this.peerConnection.setRemoteDescription(
                new RTCSessionDescription(data.answer)
            );
            this.sendIce();
            this.status = 'connected';
        },
        handleRejected(data) {
            this.status = 'idle'
            this.$toasted.show('Call has been rejected')
        },
        handleInvalid(data) {
            this.status = 'idle'
            this.$toasted.show('The called id provided is invalid')
        },
        mute() {
            this.audio = false;
            let audioStream = this.localStream.getStreams().find(stream => stream.kind == 'audio')
            if (audioStream) audioStream.enabled = false
        },
        videoMute() {
            this.video = false;
            let videoStream = this.localStream.getStreams().find(stream => stream.kind == 'video')
            if (videoStream) videoStream.enabled = false
        },
        unmute() {
            this.audio = true;
            let audioStream = this.localStream.getStreams().find(stream => stream.kind == 'audio')
            if (audioStream) audioStream.enabled = true
        },
        videoUnmute() {
            this.video = true;
            let videoStream = this.localStream.getStreams().find(stream => stream.kind == 'video')
            if (videoStream) videoStream.enabled = true
        },
        rejectCall() {
            this.status = 'idle'
        }
    }
})




