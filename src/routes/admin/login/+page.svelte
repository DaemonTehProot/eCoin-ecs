<script>
    import Login from "$lib/common/forms/Login.svelte";

    const desc = [
        {json: 'pass',    name: 'Password',     type: 'password', style: 'outlined'},
        {json: 'passNew', name: 'New Password', type: 'password', style: 'outlined', hidden: true}
    ];

    const messages = Array(desc.length).fill('This is a required field');
</script>

<svelte:head>
    <title>ECoin Admin Login</title>
</svelte:head>

<Login {desc} {messages} folder="/admin" />