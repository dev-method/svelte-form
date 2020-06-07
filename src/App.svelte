
<script>
	import settings from "./env.js";
	import PouchDB from 'pouchdb-browser'
	import { onMount } from "svelte";

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
								'Content-Type': "application/json"
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
					'Content-Type': "application/json"
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

<main id="form">
	<div class="form-container">
		<form class="contact2-form validate-form">
			<span class="contact2-form-title">
				ОСТАВЬТЕ СООБЩЕНИЕ ДЛЯ НАС
			</span>
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
				{#if state.recaptcha.message}
				<div class="recaptcha-alert">
					{state.recaptcha.message}
				</div>
				{/if}
				<div id="google-captcha">
				</div>
				<div on:click = {validateAndSendForm(state)} class="contact2-form-btn">
					ОТПРАВИТЬ СООБЩЕНИНЕ
				</div>
			</div>
		</form>
	</div>
</main>

<style>
	.form-container {
		width: 50%;
		margin: auto;
	}
	main {
		text-align: center;
		padding: 1em;
		margin: 0 auto;
	}

	input {
		outline: none;
		border: none;
	}

	textarea {
		outline: none;
		border: none;
	}
	.contacts-form-group {
		display: flex;
	}
	.form-mail-wr {
		margin-left: 20px;
	}
	textarea:focus, input:focus {
		border-color: transparent !important;
	}
	.contact2-form {
		width: 100%;
	}
	.contact2-form input {
		border: none;
	}
	.contact2-form textarea {
		border: none;
	}
	.contact2-form-title {
		display: block;
		font-size: 39px;
		color: #333333;
		line-height: 1.2;
		text-align: center;
		padding-bottom: 90px;
	}
	.validate-input:focus {
		border: none;
	}


	/*------------------------------------------------------------------
    [  ]*/

	.wrap-input2 {
		width: 100%;
		position: relative;
		border-bottom: 2px solid #adadad;
		margin-bottom: 37px;
	}

	.input2 {
		display: block;
		width: 100%;
		font-size: 15px;
		color: #555555;
		line-height: 1.2;
	}

	.focus-input2 {
		position: absolute;
		display: block;
		width: 100%;
		height: 100%;
		top: 0;
		left: 0;
		pointer-events: none;
	}

	.focus-input2::before {
		content: "";
		display: block;
		position: absolute;
		bottom: -2px;
		left: 0;
		width: 0;
		height: 2px;

		-webkit-transition: all 0.4s;
		-o-transition: all 0.4s;
		-moz-transition: all 0.4s;
		transition: all 0.4s;

		background: #678595;
		background: -webkit-linear-gradient(45deg, #678595, #7e9fb1);
		background: -o-linear-gradient(45deg, #678595, #7e9fb1);
		background: -moz-linear-gradient(45deg, #678595, #7e9fb1);
		background: linear-gradient(45deg, #678595, #7e9fb1);
	}

	.focus-input2::after {
		content: attr(data-placeholder);
		display: block;
		width: 100%;
		position: absolute;
		top: 0px;
		left: 0;
		font-size: 13px;
		color: #999999;
		line-height: 1.2;

		-webkit-transition: all 0.4s;
		-o-transition: all 0.4s;
		-moz-transition: all 0.4s;
		transition: all 0.4s;
	}

	/*---------------------------------------------*/
	input.input2 {
		height: 45px;
	}

	input.input2 + .focus-input2::after {
		top: 16px;
		left: 0;
	}

	textarea.input2 {
		min-height: 115px;
		padding-top: 13px;
		padding-bottom: 13px;
	}

	textarea.input2 + .focus-input2::after {
		top: 16px;
		left: 0;
	}

	.input2:focus + .focus-input2::after {
		top: -13px;
	}

	.input2:focus + .focus-input2::before {
		width: 100%;
	}

	.has-val.input2 + .focus-input2::after {
		top: -13px;
	}

	.has-val.input2 + .focus-input2::before {
		width: 100%;
	}

	/*------------------------------------------------------------------
    [ Button ]*/
	.container-contact2-form-btn {
		display: -webkit-box;
		display: -webkit-flex;
		display: -moz-box;
		display: -ms-flexbox;
		display: flex;
		flex-wrap: wrap;
		padding-top: 13px;
	}

	.contact2-form-btn {
		display: flex;
		justify-content: center;
		align-items: center;
		padding: 0 20px;
		min-width: 244px;
		height: 50px;
		font-size: 16px;
		font-weight: bold;
		color: #fff;
		line-height: 1.2;
		background-color: #678595;
		border: none;
	}
	.contact2-form-btn:active {
		background-color: #333333;
	}
</style>