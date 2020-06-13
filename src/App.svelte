
<script>
	import settings from "./env.js";
	import PouchDB from 'pouchdb-browser'
	import { onMount } from "svelte";
	let csrf = document.getElementsByName("csrfmiddlewaretoken")[0].value

	let  state = {
		isOnline: true,
		message:{
			name: {
				value: '',
				error: false
			},
			mail: {
				value: '',
				error: false
			},
			text: {
				value: '',
				error: false
			}
		},
		recaptcha:{
			message:'',
			isChecked: false
		}
	}

	let messages_db = new PouchDB('messages');

	window.addEventListener("offline", ()=>state.isOnline=false)
	window.addEventListener("online", ()=>state.isOnline=true)

	const onloadCallback = function() {
		grecaptcha.render('google-captcha', {
			'sitekey' : settings.recaptcha_key
		});
	};

	onMount(function () {
		window.onloadCallback = onloadCallback;
		checkPDBMessages(messages_db, settings.api_url)
	})

	function checkPDBMessages(db, url) {
		db.info().then(function (info) {
			if(info['doc_count']>0){
				db.allDocs({
					include_docs: true,
					attachments: true
				}).then(function (result) {
					let data=result.rows;
					data.map(item=>{
						fetch(url, {
							method: "POST",
							headers: {
								Accept: "application/json",
								'Content-Type': "application/json",
								'X-CSRFToken':csrf.toString()
							},
							body: JSON.stringify({"name":item.doc.name, "contacts":item.doc.mail, "description":item.doc.message})
						}).then(resp=>{

						}).catch(err=>{
							console.log(err);
						});
						db.remove(item.doc._id, item.doc._rev)
					});
				}).catch(function (err) {
					console.log(err);
				});
			}
		});
	}

	function onBlur(el, param) {
		if (param){
			el.classList.add(settings.active_class);
		}
	}

	function onFocus(param, params) {
		if (params[param].value === settings.blank_warning){
			state.message[param].value=''
		}
	}

	function checkCaptcha() {
			let response = grecaptcha.getResponse();
			return  !!response.length;
	}
	function  validateAndSendForm(func_state) {
		func_state.recaptcha.isChecked = checkCaptcha()
		if (!func_state.recaptcha.isChecked){
			func_state.recaptcha.message = settings.captcha_warning
		}
		if(!func_state.message.name.value || func_state.message.name.value === settings.blank_warning) {
			func_state.message.name.value = settings.blank_warning
			let name = document.getElementById("name")
			name.classList.add(settings.active_class)
			func_state.message.name.error = true
		}
		else {
			func_state.message.name.error = false
		}
		if(!func_state.message.mail.value || func_state.message.mail.value === settings.blank_warning) {
			func_state.message.mail.value = settings.blank_warning
			let mail = document.getElementById("mail")
			mail.classList.add(settings.active_class)
			func_state.message.mail.error = true
		}
		else {
			func_state.message.mail.error = false
		}
		if(!func_state.message.text.value || func_state.message.text.value === settings.blank_warning) {
			func_state.message.text.value = settings.blank_warning
			let text = document.getElementById("text")
			text.classList.add(settings.active_class)
			func_state.message.text.error = true
		}
		else {
			func_state.message.text.error = false
		}
		if (func_state.message.name.error || func_state.message.mail.error || func_state.message.text.error || !func_state.recaptcha.isChecked){
			state=func_state
			grecaptcha.reset()
		}
		else {
			sendMessage(func_state.message, func_state.isOnline)
		}

	}

	function sendMessage(mess, isOnline){
		if(isOnline){
			fetch(settings.api_url, {
				method: "POST",
				headers: {
					Accept: "application/json",
					'Content-Type': "application/json",
					'X-CSRFToken':csrf.toString()

				},
				body: JSON.stringify({"name":mess.name.value, "contacts":mess.mail.value, "description":mess.text.value})
			}).then(resp=>{
				cleanForm()
				grecaptcha.reset();
			}).catch(err=>{
				console.log(err);
			});
		}
		else {
			createPDBMessage(messages_db, mess.name.value, mess.mail.value, mess.text.value)
		}
	}

	async function createPDBMessage(db, name, mail, message) {
		let doc={
			"_id":(Date.now()).toString(),
			"name":name,
			"mail":mail,
			"message": message
		};
		await db.put(doc);
		await cleanForm()
		await grecaptcha.reset();
	}

	function cleanForm() {
		state = {
			isOnline: true,
			message:{
				name: {
					value: '',
					error: false
				},
				mail: {
					value: '',
					error: false
				},
				text: {
					value: '',
					error: false
				}
			},
			recaptcha:{
				message:'',
				isChecked: false
			}
		}
	}

</script>

<div id="form">
	<div class="form-container">
		<div class="contact2-form validate-form">
			<div class="contacts-form-group">
				<div class="form-name-wr wrap-input2 validate-input">
					<input on:focus = {onFocus(settings.name_field_id, state.message)} on:blur={onBlur(this,state.message.name.value)} class="input2" type="text" id={settings.name_field_id} bind:value = {state.message.name.value}>
					<span class="focus-input2" data-placeholder="КАК ВАС ЗОВУТ"></span>
				</div>
				<div class="form-mail-wr wrap-input2 validate-input">
					<input on:focus = {onFocus(settings.contacts_field_id, state.message)} on:blur={onBlur(this,state.message.mail.value)} class="input2" type="text" id={settings.contacts_field_id} bind:value = {state.message.mail.value}>
					<span class="focus-input2" data-placeholder="MAIL | ТЕЛЕФОН "></span>
				</div>
			</div>
			<div class="wrap-input2 validate-input">
				<textarea on:focus = {onFocus(settings.message_field_id, state.message)}  on:blur={onBlur(this,state.message.text.value)} class="input2" id={settings.message_field_id} bind:value = {state.message.text.value}></textarea>
				<span class="focus-input2" data-placeholder="СООБЩЕНИЕ"></span>
			</div>
			<div class="container-contact2-form-btn">
				<div on:click = {validateAndSendForm(state)} class="contact2-form-btn">
					ОТПРАВИТЬ СООБЩЕНИНЕ
				</div>
			</div>
			<div class="recaptcha-container">
				{#if state.recaptcha.message}
					<div class="recaptcha-alert">
						{state.recaptcha.message}
					</div>
				{/if}
				<div id="google-captcha">
				</div>
			</div>
		</div>
	</div>
</div>
